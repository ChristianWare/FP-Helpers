// src/icons/Arrow/Arrow.tsx
import { SVGProps } from "react";

export default function Arrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 20 20'
      width='1em'
      height='1em'
      fill='currentColor'
      stroke='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props} /* allows className, onClick, etc. */
    >
      <path
        d='
          M44 6489 L45.393 6490.435 L53 6482.828 L53 6499
          L55 6499 L55 6482.828 L62.586 6490.414 L64 6489
          C60.339 6485.339 57.504 6482.504 54 6479
          C50.034 6482.966 52.834 6480.166 44 6489
        '
        transform='translate(-44 -6479)' /* shifts the path into the 0-20 box */
        strokeWidth={1} /* outline thickness */
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
