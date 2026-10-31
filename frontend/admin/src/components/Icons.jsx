const base = { fill: 'none', viewBox: '0 0 24 24', strokeWidth: 1.8, stroke: 'currentColor', 'aria-hidden': true };

const make = (d) =>
  function Icon({ className = 'h-5 w-5' }) {
    return (
      <svg {...base} className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    );
  };

export const PlusIcon = make('M12 4.5v15m7.5-7.5h-15');
export const SearchIcon = make('m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z');
export const EyeIcon = make('M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5s8.57 3.01 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.64 19.5 12 19.5s-8.57-3.01-9.96-7.18ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z');
export const PencilIcon = make('m16.86 4.49 1.69-1.69a1.88 1.88 0 1 1 2.65 2.65L6.83 19.82a4.5 4.5 0 0 1-1.9 1.13L2.25 21.75l.8-2.69a4.5 4.5 0 0 1 1.13-1.9L16.86 4.49Zm0 0 2.65 2.65');
export const TrashIcon = make('m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.11 1.02.17m-1.02-.17L18.16 19.67a2.25 2.25 0 0 1-2.24 2.08H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.4m-12 .57c.34-.06.68-.12 1.02-.17m0 0a48.1 48.1 0 0 1 3.48-.4m7.5 0v-.92c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.92m7.5 0a48.67 48.67 0 0 0-7.5 0');
export const XIcon = make('M6 18 18 6M6 6l12 12');
export const MenuIcon = make('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5');
export const TagIcon = make('M9.57 3H5.25A2.25 2.25 0 0 0 3 5.25v4.32c0 .6.24 1.17.66 1.59l9.58 9.58a2.25 2.25 0 0 0 3.18 0l4.32-4.32a2.25 2.25 0 0 0 0-3.18L11.16 3.66A2.25 2.25 0 0 0 9.57 3ZM6 6h.01');
export const PhotoIcon = make('m2.25 15.75 5.16-5.16a2.25 2.25 0 0 1 3.18 0l5.16 5.16m-1.5-1.5 1.41-1.41a2.25 2.25 0 0 1 3.18 0l2.16 2.16m-16.5 3.75h16.5A1.5 1.5 0 0 0 21 18V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.01v.01H15V8.25Z');
export const CheckCircleIcon = make('M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z');
export const ExclamationIcon = make('M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.01v.01H12v-.01Z');
export const RefreshIcon = make('M16.02 9.35h4.99m0 0V4.36m0 4.99-3.18-3.18a8.25 8.25 0 0 0-13.8 3.7m-.05 8.77v-4.99m0 0h4.99m-4.99 0 3.18 3.18a8.25 8.25 0 0 0 13.8-3.7');
export const ChevronLeftIcon = make('M15.75 19.5 8.25 12l7.5-7.5');
export const ChevronRightIcon = make('m8.25 4.5 7.5 7.5-7.5 7.5');

export const CartIcon = make('M2.25 3h1.39a1.5 1.5 0 0 1 1.45 1.1l.4 1.4m0 0L7.2 13.2a1.5 1.5 0 0 0 1.46 1.05h8.4a1.5 1.5 0 0 0 1.45-1.12l1.4-5.4a1.5 1.5 0 0 0-1.45-1.88H5.49ZM9 19.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z');
export const BoltIcon = make('m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z');
export const ArrowUpIcon = make('M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75');
export const ArrowDownIcon = make('M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75');
export const CubeIcon = make('m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9');
