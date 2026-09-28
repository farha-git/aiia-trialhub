import { useEffect, useState } from "react";
import { getStudies } from "../lib/studies";

export default function SupabaseTest() {
  const [studies, setStudies] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudies() {
      try {
        const data = await getStudies();
        setStudies(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to connect to Supabase");
      } finally {
        setLoading(false);
      }
    }

    loadStudies();
  }, []);

  if (loading) {
    return <div>Connecting to Supabase...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Supabase connection failed</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Supabase Connection Successful</h2>

      <p>Studies found: {studies.length}</p>

      {studies.map((study) => (
        <div key={study.id}>
          <strong>{study.study_code}</strong>
          {" - "}
          {study.title}
        </div>
      ))}
    </div>
  );
}