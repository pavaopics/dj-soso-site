/* eslint-disable next/no-img-element */
import type { ImgHTMLAttributes } from 'react';
import { sectionImages, type SectionImageKey, type SectionImages } from '@/data/section-images';

export function SectionImage({ imageKey, images = sectionImages, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { imageKey: SectionImageKey; images?: SectionImages }) {
  const image = images[imageKey];
  return <img {...props} src={image.src} alt={image.alt} style={{ ...props.style, objectPosition: image.position }} />;
}
