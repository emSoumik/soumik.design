// the folder in the demo: real fonts, loaded from google fonts as the demo comes near, so each preview is set in itself.
// faces list in file order, thinnest first, the way variable fonts and collections usually come; the preview opens on regular
export type Face = { name: string; w: number; i?: boolean };
export type Font = { file: string; kind: string; family: string; format: string; by: string; faces: Face[]; sample?: string; set?: string[]; glyphs?: string };
export type Item = { name: string; kind: string; folder?: boolean; icon?: 'pdf' | 'img' | 'mov' };

export const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Instrument+Serif:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,100..900&family=JetBrains+Mono:wght@100..800&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap';

const LATIN = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!?&@#$%*()[]{}<>/\\|+-=~_.,:;\'"«»–—…•', 'ÀÁÂÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÖØŒÙÚÛÜŸß'];
const GLYPHS = 'AÁĂÂÄÀĀĄÅÃÆBCĆČÇĈĊDĎĐEÉĚÊËĖÈĒĘFGĞĢĠHĦIÍÎÏİÌĪĮJKĶLĹĽĻŁMNŃŇŅÑOÓÔÖÒŐŌØÕŒPÞQRŔŘŖSŚŠŞȘTŤŢȚUÚÛÜÙŰŪŲŮVWẂŴẄẀXYÝŶŸỲZŹŽŻ';

export const FONTS: Font[] = [
  { file: 'Geist[wght].woff2', kind: 'Web font (WOFF2)', family: 'Geist', format: 'WOFF2 Variable', by: 'Basement.studio, Andrés Briganti, Mateo Zaragoza',
    faces: [{ name: 'Thin', w: 100 }, { name: 'Light', w: 300 }, { name: 'Regular', w: 400 }, { name: 'Medium', w: 500 }, { name: 'Bold', w: 700 }, { name: 'Black', w: 900 }] },
  { file: 'InstrumentSerif-Regular.ttf', kind: 'TrueType font', family: 'Instrument Serif', format: 'TrueType', by: 'Rodrigo Fuenzalida, Jordan Egstad',
    faces: [{ name: 'Regular', w: 400 }, { name: 'Italic', w: 400, i: true }] },
  { file: 'Fraunces[SOFT,WONK,opsz,wght].ttf', kind: 'TrueType font', family: 'Fraunces', format: 'TrueType Variable', by: 'Undercase Type',
    faces: [{ name: 'Thin', w: 100 }, { name: 'Light', w: 300 }, { name: 'Regular', w: 400 }, { name: 'SemiBold', w: 600 }, { name: 'Black', w: 900 }] },
  { file: 'JetBrainsMono[wght].ttf', kind: 'TrueType font', family: 'JetBrains Mono', format: 'TrueType Variable', by: 'JetBrains, Philipp Nurullin, Konstantin Bulenkov',
    faces: [{ name: 'Thin', w: 100 }, { name: 'Light', w: 300 }, { name: 'Regular', w: 400 }, { name: 'Bold', w: 700 }, { name: 'ExtraBold', w: 800 }] },
  { file: 'TiroDevanagariHindi-Regular.ttf', kind: 'TrueType font', family: 'Tiro Devanagari Hindi', format: 'TrueType', by: 'Tiro Typeworks, John Hudson, Fiona Ross',
    faces: [{ name: 'Regular', w: 400 }, { name: 'Italic', w: 400, i: true }],
    sample: 'आज की हवा कैसी है? The quick brown fox',
    set: ['अ आ इ ई उ ऊ ऋ ए ऐ ओ औ', 'क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण', 'त थ द ध न प फ ब भ म य र ल व', '० १ २ ३ ४ ५ ६ ७ ८ ९', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    glyphs: 'अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह' },
];
export const latin = (f: Font) => f.set ?? LATIN;
export const glyphs = (f: Font) => [...(f.glyphs ? (f.glyphs.match(/./gu) ?? []) : [...GLYPHS])];

export const DOWNLOADS: Item[] = [
  { name: 'Fonts', kind: 'Folder', folder: true },
  { name: 'FigBuild brief.pdf', kind: 'PDF document', icon: 'pdf' },
  { name: 'Moodboard.png', kind: 'PNG image', icon: 'img' },
  { name: 'Screen Recording.mov', kind: 'QuickTime movie', icon: 'mov' },
];
