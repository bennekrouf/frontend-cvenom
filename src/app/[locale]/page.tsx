import LayoutTemplate from '@/components/layout/LayoutTemplate';
import LandingPage from '@/components/landing/LandingPage';

export default function HomePage() {
  return (
    <LayoutTemplate hideFooter>
      <LandingPage />
    </LayoutTemplate>
  );
}
