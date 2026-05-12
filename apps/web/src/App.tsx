const App = () => {
  return (
    <main className='min-h-screen bg-slate-950 px-4 py-6 text-slate-50'>
      <section className='mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center'>
        <div className='rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl'>
          <p className='text-sm font-medium text-slate-400'>TimeTracker</p>
          <h1 className='mt-3 text-3xl font-bold tracking-tight'>
            Ready to track time.
          </h1>
        </div>
      </section>
    </main>
  );
};

export default App;
