import { SiteExperience } from '@/components/site-experience';
import { gallery } from '@/data/content';
import { site } from '@/data/site';

export default function Home() {
  return <SiteExperience site={site} gallery={gallery} />;
}
