// Flora: the flowers that keep their own colours, drawn in the same chunky stitch as the rest of the garden,
// plus the butterfly sprites. a flower's head is one letter per cell, coloured from its own palette
// (G g L are the garden's greens, worked into the head); each gets the usual stem underneath.

export const FLOWERS = {
  // a stargazer: six pointed petals, a dark stripe down each, stamens at the heart
  lily: {
    pal: { P: '#f7a3c0', p: '#d9467a', A: '#7a2a14', c: '#d8e07a' },
    head: ['.....P.....', '....PpP....', 'PP..PpP..PP', '.PPP.p.PPP.', '..PpPAPpP..', '...PAcAP...', '..PpPAPpP..', '.PPP.p.PPP.', 'PP..PpP..PP', '....PpP....', '.....P.....'],
  },
  iris: {
    pal: { P: '#8a70f0', p: '#5a3fc0', q: '#3a2890', C: '#ffd04a', c: '#f0a51c' },
    head: ['....P....', '...PpP...', '...PpP...', '.P.PpP.P.', 'PPPpCpPPP', 'PpPCcCPpP', 'qpP.p.Ppq', 'qq..p..qq', '....L....'],
  },
  daisy: {
    pal: { P: '#f6f3fb', p: '#b9b0d0', C: '#ffc21a', c: '#d98a10' },
    head: ['...p.p.p...', '.p.pPpPp.p.', '..pPP.PPp..', 'ppP.CCC.Ppp', '.PP.CcC.PP.', 'pPPCcccCPPp', '.PP.CcC.PP.', 'ppP.CCC.Ppp', '..pPP.PPp..', '.p.pPpPp.p.', '...p.p.p...'],
  },
  rose: {
    pal: { P: '#f2607e', p: '#c93a5a', q: '#9c2240' },
    head: ['..qPPPq..', '.qPpppPq.', 'qPpPPPpPq', 'PpPpqpPpP', 'PpPqPpPpP', 'qPpPppPPq', '.qPPPPPq.', 'L.qqqqq.L', '.LL.G.LL.', '....G....'],
  },
  rosebud: {
    pal: { P: '#f2607e', p: '#c93a5a', q: '#9c2240' },
    head: ['...PPP...', '..PpqpP..', '.PpPPPpP.', '.PPpqpPP.', '.qPPpPPq.', '..qPPPq..', '.L.qqq.L.', '..LLGLL..', '....G....'],
  },
  lavender: {
    pal: { P: '#b98af5', p: '#8656cc' },
    head: ['....P....', '.P..p..P.', '.p.PpP.p.', 'PpP.p.PpP', '.p.PpP.p.', 'PpP.p.PpP', '.p.PpP.p.', '.L..p..L.', '..L.L.L..', '...LLL...', '....L....'],
  },
  forget: {
    pal: { P: '#5aa9f0', C: '#ffd04a' },
    head: ['.P.....P.', 'PCP...PCP', '.P..P..P.', '..LPCP.L.', '...LPL.L.', '.P..L.L..', 'PCP.LL...', '.PLLL....', '....L....'],
  },
  poppy: {
    pal: { P: '#e8412f', p: '#b8261d', K: '#2a1a1a', k: '#6a4a2a' },
    head: ['..PP.PP..', '.PPpPpPP.', 'PPpPKPpPP', 'PpPKkKPpP', 'PPpPKPpPP', '.PPpPpPP.', '..pPPPp..', '...ppp...'],
  },
  daffodil: {
    pal: { P: '#ffe066', p: '#f0c020', C: '#ff9a1a', c: '#e06a10' },
    head: ['..P......', '.PPP.....', 'PPpPCC...', '.PpCcCC..', 'PPpPCcCC.', '.PpCcCC..', 'PPpPCC...', '.PPPG....', '..P.G....'],
  },
  pansy: {
    pal: { Q: '#7a4cd0', q: '#4a2a90', P: '#ffd84a', p: '#f0b020', K: '#4a2a90', C: '#ffffff', c: '#ff9a1a' },
    head: ['.qq...qq.', 'qQQq.qQQq', 'qQQQqQQQq', 'PPqQQQqPP', 'PpPKCKPpP', 'PPKPcPKPP', '.PPpKpPP.', '..PPPPP..'],
  },
  bluebell: {
    pal: { P: '#6b8cf0', p: '#3d5cc8' },
    head: ['..GGGGG..', '.G..G..G.', '.p..G..p.', 'pPp.G.pPp', 'PpP.G.PpP', 'PPP.G.PPP', 'P.P.G.P.P'],
  },
  cosmos: {
    pal: { P: '#f7a3c8', p: '#e06a9c', C: '#ffd04a', c: '#e3a21a' },
    head: ['...PPP...', '.PP.P.PP.', 'PPpP.PpPP', 'P.pPCPp.P', '.PPCcCPP.', 'P.pPCPp.P', 'PPpP.PpPP', '.PP.P.PP.', '...PPP...'],
  },
};

// butterflies: wings open; the closed frame is made by squashing toward the body
export const BUTTERFLIES = {
  flyblue: {
    pal: ['#302e30', '#96def2', '#bce9f5'],
    head: [3, 5],
    rows: [
      '...00........',
      '...000.......',
      '..0011.......',
      '..0111.......',
      '..0121.0.....',
      '.01122.00....',
      '0112200......',
      '0122000......',
      '002000222110.',
      '...0022222100',
      '....222111000',
      '....2211000..',
      '....0110.....',
      '....000......',
    ],
  },
  flypink: {
    pal: ['#302e30', '#ffbace', '#facad9'],
    head: [10, 5],
    rows: [
      '.........00...',
      '........000...',
      '........1100..',
      '........1110..',
      '......0.1210..',
      '.....00.22110.',
      '.......0022110',
      '.0112220002210',
      '00122222000200',
      '00011122200...',
      '..0001122.....',
      '.....0110.....',
      '......000.....',
    ],
  },
  flybig: {
    pal: ['#212026', '#4038ad', '#546deb', '#79bafe', '#a9ecff'],
    head: [6, 6],
    rows: [
      '.....111..................',
      '....12221.................',
      '....122221................',
      '....122221................',
      '....1333221...............',
      '...13333321...............',
      '...13333321...............',
      '..1233144321..............',
      '..1233414411..............',
      '..1223441411..............',
      '...122144141..............',
      '....11111411..............',
      '..1113331111.0............',
      '.133331111100.............',
      '1231113111000111111.......',
      '1233333110001114112111....',
      '1233321..001114144322211..',
      '.12221..0.111114144332221.',
      '..111..0..1113144143332221',
      '......0..13313114413332221',
      '........123133123331332221',
      '.......123313212233331111.',
      '.......1233331.122211.....',
      '.......1233321..111.......',
      '........12221.............',
      '.........111..............',
    ],
  },
};
