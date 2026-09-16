export default function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#111',
      color: '#fff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ff4444' }}>
        Stránky jsou v úplné rekonstrukci
      </h1>
      <p style={{ fontSize: '1.1rem', maxWidth: '500px', lineHeight: '1.5', color: '#ccc' }}>
        Až znovu poběží, bude nutná nová registrace. Děkujeme za trpělivost!
      </p>
    </div>
  );
}