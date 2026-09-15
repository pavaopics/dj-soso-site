import { SiteExperience } from '@/components/site-experience';
import { site } from '@/data/site';
import { getPublicContent } from '@/lib/content-source';

export default async function Home() {
  const content = await getPublicContent();
  return <SiteExperience site={site} gallery={content.gallery} sectionImages={content.sectionImages} />;
}
