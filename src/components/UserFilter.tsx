import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, LayoutGrid } from 'lucide-react';

interface UserFilterProps {
  value: string;
  onChange: (value: string) => void;
  showAllOption?: boolean;
  showTotalOption?: boolean; // Nova prop para mostrar "Todas as Contas"
  className?: string;
}

export function UserFilter({ 
  value, 
  onChange, 
  showAllOption = true, 
  showTotalOption = false,
  className 
}: UserFilterProps) {
  const { users } = useAuth();

  const activeUsers = users.filter(u => u.is_active !== false);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          {value === 'total' ? <LayoutGrid className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          <SelectValue placeholder="Filtrar usuário" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {showTotalOption && (
          <SelectItem value="total">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span className="font-bold">Todas as Contas</span>
            </div>
          </SelectItem>
        )}
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Contas da Família</span>
            </div>
          </SelectItem>
        )}
        {activeUsers.map(user => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: user.avatar_color }}
              />
              {user.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}