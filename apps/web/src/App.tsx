import { SelectionCard } from './components/SelectionCard';

const App = () => {
  return (
    <main className='min-h-screen bg-slate-950 px-4 py-6 text-slate-50'>
      <section className='mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center'>
        <SelectionCard />
      </section>
    </main>
  );
};

export default App;
