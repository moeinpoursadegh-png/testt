import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

export default function NotFound() {
  return (
    <div className="page notfound">
      <p className="kicker mono">404 · Empty frame</p>
      <h1 className="display">Nothing on this <em>part of the canvas.</em></h1>
      <p className="lede">The page may have moved or is not published yet.</p>
      <div className="hero-cta">
        <Link to="/work" className="btn btn-primary">Browse the work <Icon name="arrow" size={14} /></Link>
        <Link to="/" className="btn">Go home</Link>
      </div>
    </div>
  );
}
