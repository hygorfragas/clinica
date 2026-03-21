export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Agenda clínica</h1>
      <p>
        Camada Supabase pronta: use{" "}
        <code>createServerSupabaseClient</code> /{" "}
        <code>createBrowserSupabaseClient</code> e{" "}
        <code>clinic(client)</code> para o schema <code>clinic</code>.
      </p>
    </main>
  );
}
