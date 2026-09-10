const crypto = require('crypto');

// Funkce pro generování náhodného kódu (6-7 znaků, bez matoucích znaků)
function generateSecretCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
        code += chars[crypto.randomInt(0, chars.length)];
    }
    return code;
}

// Funkce pro odemčení receptu přes Supabase
async function handleUnlockRecipeSupabase(req, res, supabase) {
    const { playerId, inputCode } = req.body;

    if (!playerId || !inputCode) {
        return res.status(400).json({ success: false, message: 'Chybí ID hráče nebo kód.' });
    }

    try {
        // 1. Zjistíme, zda kód odpovídá nějakému aktuálnímu receptu
        const { data: recipes, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('secret_code', inputCode);

        if (recipeError) throw recipeError;

        if (recipes && recipes.length > 0) {
            // --- SCÉNÁŘ A: Kód je platný a aktuální ---
            const recipe = recipes[0];

            // Zkontrolujeme, zda už hráč tento recept má
            const { data: existingOwnership, error: ownerError } = await supabase
                .from('player_recipes')
                .select('*')
                .eq('player_id', playerId)
                .eq('recipe_id', recipe.id);

            if (ownerError) throw ownerError;

            if (existingOwnership && existingOwnership.length > 0) {
                return res.status(400).json({ success: false, message: 'Tento recept už máš odemčený!' });
            }

            // 1. Zapsat vlastnictví hráči
            const { error: insertError } = await supabase
                .from('player_recipes')
                .insert([{ player_id: playerId, recipe_id: recipe.id }]);

            if (insertError) throw insertError;

            // 2. Vygenerovat nový náhodný kód pro tento recept (ochrana proti sdílení)
            let newCode;
            let codeExists = true;
            while (codeExists) {
                newCode = generateSecretCode();
                const { data: checkDup } = await supabase
                    .from('recipes')
                    .select('id')
                    .eq('secret_code', newCode);
                if (!checkDup || checkDup.length === 0) codeExists = false;
            }

            // Přepsat starý kód novým v tabulce recipes
            const { error: updateError } = await supabase
                .from('recipes')
                .update({ secret_code: newCode })
                .eq('id', recipe.id);

            if (updateError) throw updateError;

            // 3. Zapsat úspěšný pokus do logu
            await supabase
                .from('code_attempts_log')
                .insert([{
                    player_id: playerId,
                    input_code: inputCode,
                    recipe_id: recipe.id,
                    status: 'SUCCESS'
                }]);

            return res.status(200).json({
                success: true,
                message: 'Recept byl úspěšně odemčen!',
                recipe: {
                    id: recipe.id,
                    name: recipe.name,
                    job: recipe.job,
                    level: recipe.level,
                    data: JSON.parse(recipe.data_json)
                }
            });

        } else {
            // --- SCÉNÁŘ B: Kód není aktuální (možná pokus o podvod) ---
            // Zjistíme, zda tento kód někdo v minulosti už úspěšně použil
            const { data: pastLogs, error: logError } = await supabase
                .from('code_attempts_log')
                .select('recipe_id, player_id')
                .eq('input_code', inputCode)
                .eq('status', 'SUCCESS')
                .limit(1);

            if (logError) throw logError;

            let status = 'INVALID_CODE';
            let matchedPlayerId = null;
            let targetRecipeId = null;

            if (pastLogs && pastLogs.length > 0) {
                status = 'ALREADY_USED';
                matchedPlayerId = pastLogs[0].player_id;
                targetRecipeId = pastLogs[0].recipe_id;
            }

            // Zapsat pokus do bezpečnostního logu
            await supabase
                .from('code_attempts_log')
                .insert([{
                    player_id: playerId,
                    input_code: inputCode,
                    recipe_id: targetRecipeId,
                    status: status,
                    matched_player_id: matchedPlayerId
                }]);

            if (status === 'ALREADY_USED') {
                return res.status(400).json({
                    success: false,
                    message: 'Tento kód už byl dříve použit jiným týmem! Pokus o podvod byl zaznamenán.'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Neplatný kód. Zkontroluj, zda jsi ho opsal správně.'
                });
            }
        }

    } catch (error) {
        console.error('Chyba při odemykání receptu:', error);
        return res.status(500).json({ success: false, message: 'Interní chyba serveru.' });
    }
}

module.exports = { handleUnlockRecipeSupabase };