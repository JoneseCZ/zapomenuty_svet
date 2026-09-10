import { supabase } from '../supabaseClient';

// Funkce pro generování náhodného kódu přímo v JS
function generateSecretCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
    }
    return code;
}

// Hlavní funkce pro pokus o odemknutí kódu
export async function unlockRecipe(playerId, inputCode) {
    if (!playerId || !inputCode) {
        return { success: false, message: 'Zadej kód.' };
    }

    // 1. Zjistíme, zda kód odpovídá nějakému aktuálnímu receptu
    const { data: recipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('secret_code', inputCode);

    if (recipeError) {
        console.error(recipeError);
        return { success: false, message: 'Chyba databáze.' };
    }

    if (recipes && recipes.length > 0) {
        // --- SCÉNÁŘ A: Kód je platný a aktuální ---
        const recipe = recipes[0];

        // Zkontrolujeme, zda už hráč tento recept má
        const { data: existingOwnership } = await supabase
            .from('player_recipes')
            .select('*')
            .eq('player_id', playerId)
            .eq('recipe_id', recipe.id);

        if (existingOwnership && existingOwnership.length > 0) {
            return { success: false, message: 'Tento recept už máš odemčený!' };
        }

        // 1. Zapsat vlastnictví hráči
        const { error: insertError } = await supabase
            .from('player_recipes')
            .insert([{ player_id: playerId, recipe_id: recipe.id }]);

        if (insertError) return { success: false, message: 'Chyba při ukládání receptu.' };

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
        await supabase
            .from('recipes')
            .update({ secret_code: newCode })
            .eq('id', recipe.id);

        // 3. Zapsat úspěšný pokus do logu
        await supabase
            .from('code_attempts_log')
            .insert([{
                player_id: playerId,
                input_code: inputCode,
                recipe_id: recipe.id,
                status: 'SUCCESS'
            }]);

        return {
            success: true,
            message: 'Recept byl úspěšně odemčen!',
            recipe: recipe
        };

    } else {
        // --- SCÉNÁŘ B: Kód není aktuální (možná pokus o podvod) ---
        // Zjistíme, zda tento kód někdo v minulosti už úspěšně použil
        const { data: pastLogs } = await supabase
            .from('code_attempts_log')
            .select('recipe_id, player_id')
            .eq('input_code', inputCode)
            .eq('status', 'SUCCESS')
            .limit(1);

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
            return {
                success: false,
                message: 'Tento kód už byl dříve použit jiným týmem! Pokus o podvod byl zaznamenán.'
            };
        } else {
            return {
                success: false,
                message: 'Neplatný kód. Zkontroluj, zda jsi ho opsal správně.'
            };
        }
    }
}