import LayoutTemplate from '@/components/layout/LayoutTemplate';
import CreditsPage from '@/components/payment/CreditsPage';

export const metadata = { title: 'Credits — cVenom' };

export default function CreditsRoute() {
  return (
    <LayoutTemplate>
      <CreditsPage />
    </LayoutTemplate>
  );
}
