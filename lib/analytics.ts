export type AnalyticsEvent = 'hero_watch_clicked'|'video_played'|'video_completed'|'gallery_opened'|'instagram_clicked'|'tiktok_clicked'|'youtube_clicked'|'booking_contact_clicked'|'whatsapp_clicked';
export function track(event:AnalyticsEvent,detail?:Record<string,string>){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('dj-soso:analytics',{detail:{event,...detail}}));}
