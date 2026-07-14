import Link from 'next/link';
import { APP_NAME } from '@fitora/shared';

export function Footer(): React.JSX.Element {
  return (
    <footer className="bg-foreground text-white/80 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
                F
              </span>
              <span className="text-lg font-bold text-white">{APP_NAME}</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Your one-stop platform to book venues, find trainers, and join sports activities near you.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/courts" className="hover:text-primary transition-colors">Book courts</Link></li>
              <li><Link href="/training" className="hover:text-primary transition-colors">Kids training</Link></li>
              <li><Link href="/memberships" className="hover:text-primary transition-colors">Memberships</Link></li>
              <li><Link href="/bookings" className="hover:text-primary transition-colors">My bookings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">For partners</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-primary transition-colors">List your venue</Link></li>
              <li><Link href="/owner" className="hover:text-primary transition-colors">Court owner portal</Link></li>
              <li><Link href="/trainer" className="hover:text-primary transition-colors">Trainer dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Popular cities</h4>
            <ul className="space-y-2 text-sm">
              {['Bangalore', 'Mumbai', 'Hyderabad', 'Chennai', 'Pune'].map((city) => (
                <li key={city}>
                  <Link href={`/courts?city=${city}`} className="hover:text-primary transition-colors">
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Inspired by the best in sports booking · Built for India</p>
        </div>
      </div>
    </footer>
  );
}
