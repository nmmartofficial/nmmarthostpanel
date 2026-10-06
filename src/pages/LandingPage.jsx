import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-[#fbfaf6]">
      <img
        src="/images/nm-mart-home-poster.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center landscape:object-[center_60%]"
      />
      <h1 className="sr-only">NM MART retail management</h1>
      <a
        href="tel:+918282827240"
        aria-label="Call NM MART at 82828 27240"
        className="absolute left-1/2 top-[52.1%] h-[6.3%] w-[min(64vw,30svh)] -translate-x-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#d9a43c] landscape:top-[27%] landscape:h-[26%] landscape:w-[54vw]"
      />
      <Link
        to="/login"
        aria-label="Enter Admin Panel"
        className="absolute left-1/2 top-[61%] flex h-[6.8%] w-[min(75vw,34svh)] -translate-x-1/2 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#d9a43c] landscape:top-[57%] landscape:h-[26%] landscape:w-[60vw]"
      />
    </main>
  );
}
