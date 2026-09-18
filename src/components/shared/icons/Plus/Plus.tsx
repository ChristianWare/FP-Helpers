// src/icons/Plus/Plus.tsx
import { SVGProps } from "react";

export default function Plus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={3}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-plus-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props} // allows overriding size, className, etc.
    >
      <path d='M5 12h14' />
      <path d='M12 5v14' />
    </svg>
  );
}
