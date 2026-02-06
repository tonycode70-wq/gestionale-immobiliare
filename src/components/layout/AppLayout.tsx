import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { FAB } from './FAB';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  showFAB?: boolean;
}

export function AppLayout({ children, title, showFAB = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title={title} />
      
      <main className="flex-1 overflow-y-auto pb-20 pt-14">
        <div className="container max-w-lg mx-auto px-4 py-4">
          {children}
        </div>
      </main>
      
      {showFAB && <FAB />}
      <BottomNav />
    </div>
  );
}
