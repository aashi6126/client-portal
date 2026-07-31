// Rothschild Navy palette tokens shared by data-driven UI (status dots,
// outstanding item chips, renewal pills). Kept in sync with the block
// at the top of App.js's createTheme() call - update both together.
//
// Prefer importing these constants over hardcoding hex codes in
// components. If a component needs the CURRENT theme's version of
// these values, reach into theme.palette.* via useTheme() instead.

export const STATUS_COLORS = {
  active:   '#5e7d4e',   // formal dark moss
  prospect: '#a86e1f',   // burnt sienna
  inactive: '#a8a9b3',   // cool faded stone
};

export const OUTSTANDING_ITEM_COLORS = {
  'Premium Due': '#a86e1f',   // burnt sienna
  'In Audit':    '#3e5a7a',   // dusty navy-blue
  'Cancel Due':  '#8a3323',   // deep rust
  'Add Line':    '#6b4a8a',   // muted plum
  'Complete':    '#5e7d4e',   // moss
};

// Values that count as "outstanding item was resolved, not open". Any
// non-null outstanding_item whose value isn't in this set is treated as
// an open item (renders a colored chip, counts toward the filter and
// the Dashboard Actions tab).
export const OUTSTANDING_CLEARED = new Set(['', 'None', 'Complete']);

export const RENEWAL_PILL = {
  bg:     '#f0e2c8',   // gold-tinted parchment
  fg:     '#7a5518',   // deep gold
  border: '#c9b06d',   // brass
};

// Boxed subframe used inside modals ("Policy Details", "Contact Info",
// per-plan cards). Spread into a Box's sx prop.
export const FORM_SECTION_SX = {
  border: '1px solid #dcd2be',
  bgcolor: '#ebe2d0',
  borderRadius: 1.5,
  p: 1.75,
};
