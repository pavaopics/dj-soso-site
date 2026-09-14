import { SiteExperience } from '@/components/site-experience';
import { gallery, musicLab, story, videos } from '@/data/content';
import { site } from '@/data/site';

export default function Home() {
  return <SiteExperience site={site} videos={videos} musicLab={musicLab} story={story} gallery={gallery} />;
}
