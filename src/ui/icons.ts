import {
  ArrowRight, ArrowUpRight, BookOpenText, Check, ChevronLeft, CircleCheck,
  Delete, Eye, LoaderCircle, Pause, Pencil, Play, Plus, Redo2, Repeat2,
  SlidersHorizontal, Square, TriangleAlert, Undo2, X, createElement,
  type IconNode
} from 'lucide';

const icons: Record<string, IconNode> = {
  back: ChevronLeft, edit: Pencil, read: Eye, settings: SlidersHorizontal,
  saved: CircleCheck, saving: LoaderCircle, play: Play, pause: Pause,
  stop: Square, practice: Repeat2, close: X, arrow: ArrowUpRight,
  score: BookOpenText, undo: Undo2, redo: Redo2, insert: Plus,
  deleteNote: Delete, alert: TriangleAlert, range: ArrowRight, check: Check
};
const markup = new Map<string, string>();

export function icon(name: string): string {
  if (!Object.hasOwn(icons, name)) return '';
  if (!markup.has(name)) {
    markup.set(name, createElement(icons[name], {
      class: 'ui-icon', 'data-icon': name, 'aria-hidden': 'true',
      focusable: 'false', 'stroke-width': 1.75
    }).outerHTML);
  }
  return markup.get(name)!;
}
