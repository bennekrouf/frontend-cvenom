import LayoutTemplate from '@/components/layout/LayoutTemplate';
import BdPortal from '@/components/bd/BdPortal';

export const metadata = { title: 'Business Developer Portal — cVenom' };

export default function BdPage() {
  return (
    <LayoutTemplate>
      <BdPortal />
    </LayoutTemplate>
  );
}
