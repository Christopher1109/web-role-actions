import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
