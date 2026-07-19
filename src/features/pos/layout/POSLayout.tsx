import React from 'react';
import { cn } from '../../../utils/helpers';
import LeftSidebar from '../components/LeftSidebar';
import CenterPanel from '../components/CenterPanel';
import RightSidebar from '../components/RightSidebar';

interface POSLayoutProps {
  className?: string;
}

const POSLayout: React.FC<POSLayoutProps> = ({ className }) => {
  return (
    <div className={cn(
      'flex h-[calc(100vh-60px)] bg-neutral-100 overflow-hidden -m-4 transition-all duration-300',
      'flex-col md:flex-row', // Responsive design: column on mobile, row on desktop
      className
    )}>
      <LeftSidebar />
      <CenterPanel />
      <RightSidebar />
    </div>
  );
};

export default POSLayout;
