import { useEffect, useState } from 'react';

type HealthStatus = {
  ok: boolean;
  message?: string;
};

const App = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/health`,
        );

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const data = (await response.json()) as HealthStatus;
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown API error');
      }
    };

    void checkApiHealth();
  }, []);

  return (
    <main className='min-h-screen bg-slate-950 px-4 py-6 text-slate-50'>
      <section className='mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center'>
        <div className='rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl'>
          <p className='text-sm font-medium text-slate-400'>TimeTracker</p>
          <h1 className='mt-3 text-3xl font-bold tracking-tight'>
            Ready to track time.
          </h1>

          <div className='mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm'>
            <p className='font-medium text-slate-300'>API status</p>

            {health && (
              <p className='mt-2 text-emerald-400'>
                Connected: {health.message ?? 'API is healthy'}
              </p>
            )}

            {error && (
              <p className='mt-2 text-red-400'>
                API connection failed: {error}
              </p>
            )}

            {!health && !error && (
              <p className='mt-2 text-slate-400'>Checking API...</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default App;
