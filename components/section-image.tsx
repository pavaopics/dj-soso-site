/* eslint-disable next/no-img-element */
import type { ImgHTMLAttributes } from 'react';
import { sectionImages, type SectionImageKey } from '@/data/section-images';

export function SectionImage({ imageKey, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { imageKey: SectionImageKey }) {
  const image = sectionImages[imageKey];
  return <img {...props} src={image.src} alt={image.alt} style={{ ...props.style, objectPosition: image.position }} />;
}
