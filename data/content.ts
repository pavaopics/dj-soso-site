export type VideoSource = 'direct' | 'youtube' | 'instagram' | 'tiktok';
export type VideoItem = { id:string; title:string; subtitle:string; category:string; videoUrl?:string; poster?:string; source:VideoSource; aspectRatio:'9/16'|'16/9'; featured?:boolean };
export type MediaItem = { id:string; src?:string; alt:string; width:number; height:number; category:string; featured?:boolean };
export const videos: VideoItem[] = [
  { id:'dj-set', title:'Hands on the decks', subtitle:'Transition practice', category:'DJ SET', source:'direct', aspectRatio:'9/16', featured:true },
  { id:'synth', title:'Finding a new sound', subtitle:'Playing with sounds', category:'SYNTH', source:'direct', aspectRatio:'9/16' },
  { id:'ableton', title:'A loop from scratch', subtitle:'Building a loop', category:'ABLETON', source:'direct', aspectRatio:'9/16' },
  { id:'keys', title:'Note by note', subtitle:'Learning the melody', category:'KEYS', source:'youtube', aspectRatio:'9/16' },
  { id:'vocals', title:'Ideas on the mic', subtitle:'Recording ideas', category:'VOCALS', source:'direct', aspectRatio:'9/16' },
];
export const musicLab = [
  ['DJING','Reading the room. Finding the next track.'], ['ABLETON','Turning small ideas into something you can hear.'],
  ['SYNTH','Twisting knobs until a new sound appears.'], ['KEYS','Learning melodies one note at a time.'],
  ['LOOPS','Building, repeating, changing, trying again.'], ['VOICE','Collecting words, hooks and little vocal ideas.'],
].map(([title,copy],index)=>({id:title.toLowerCase(),title,copy,index}));
export const story = [
  {id:'music',lines:['IT STARTED','WITH MUSIC.'],note:'01 / LISTEN'}, {id:'decks',lines:['THEN CAME','THE DECKS.'],note:'02 / MIX'},
  {id:'keys',lines:['THEN KEYS.','SYNTHS.'],note:'03 / PLAY'}, {id:'loops',lines:['LOOPS.','ABLETON.'],note:'04 / BUILD'},
  {id:'now',lines:['AND NOW?',"WE'RE JUST",'GETTING STARTED.'],note:'05 / KEEP GOING'},
];
const shapes=[[4,5],[3,4],[1,1],[4,5],[3,2],[4,5],[1,1],[3,4],[4,3],[4,5],[3,4],[1,1],[4,5],[3,2],[4,5],[1,1],[3,4],[4,5]];
export const gallery: MediaItem[] = shapes.map(([width,height],index)=>({id:`gallery-${index+1}`,alt:`DJ Sosô media placeholder ${index+1}`,width,height,category:['portrait','performance','equipment','backstage'][index%4],featured:index<3}));
