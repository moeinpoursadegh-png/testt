import { useState } from 'react';
import { useSite } from '../content/store';
import { Icon, LinkedInIcon } from '../components/Icon';
import { useHead } from '../components/Shell';

export default function Contact() {
  const { site } = useSite();
  const { profile } = site;
  useHead(`Contact — ${profile.name}`, `Get in touch with ${profile.name}.`);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied('idle'), 2400);
  };

  return (
    <div className="page contact-page">
      <header className="page-head">
        <p className="kicker mono">Contact</p>
        <h1 className="display">Let’s work on something <em>worth solving.</em></h1>
        <p className="lede">Email is the fastest way to reach me. I’m based in {profile.location} and work with teams remotely.</p>
      </header>
      <ul className="contact-cards">
        <li>
          <span className="kicker mono">Email</span>
          <a className="contact-value" href={`mailto:${profile.email}`}>{profile.email}</a>
          <div className="hero-cta">
            <a className="btn btn-primary" href={`mailto:${profile.email}`}><Icon name="mail" /> Write an email</a>
            <button type="button" className="btn" onClick={copy}>
              <Icon name={copied === 'ok' ? 'check' : 'copy'} /> {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed — select it above' : 'Copy address'}
            </button>
          </div>
          <span className="sr-only" role="status">{copied === 'ok' ? 'Email address copied' : ''}</span>
        </li>
        <li>
          <span className="kicker mono">LinkedIn</span>
          <a className="contact-value" href={profile.linkedin} target="_blank" rel="noreferrer">{profile.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>
          <div className="hero-cta">
            <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer"><LinkedInIcon /> Open profile <Icon name="out" size={14} /></a>
          </div>
        </li>
        {profile.showPhone && profile.phone && (
          <li>
            <span className="kicker mono">Phone</span>
            <a className="contact-value" href={`tel:${profile.phone.replace(/\s/g, '')}`}>{profile.phone}</a>
          </li>
        )}
      </ul>
    </div>
  );
}
