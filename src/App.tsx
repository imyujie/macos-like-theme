import { useEffect, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { Tooltip } from '@base-ui/react/tooltip';
import { ComponentDocs } from './ComponentDocs';
import { isComponentId, type ComponentId } from './componentCatalog';
import { MailScene, SettingsScene } from './Scenes';
import { mac, SfSymbol } from './theme';

type Appearance = 'light' | 'dark';
type Route = { mode: 'library'; component: ComponentId } | { mode: 'mail' | 'settings' };

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'preview/mail') return { mode: 'mail' };
  if (hash === 'preview/settings') return { mode: 'settings' };
  const component = hash.startsWith('components/') ? hash.slice('components/'.length) : '';
  return { mode: 'library', component: isComponentId(component) ? component : 'button' };
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [appearance, setAppearance] = useState<Appearance>('light');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.body.dataset.appearance = appearance;
    document.body.style.setProperty('--mac-accent', '#3478f6');
  }, [appearance]);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return (
    <Tooltip.Provider delay={450}>
      {route.mode === 'library' ? (
        <ComponentDocs selectedId={route.component} appearance={appearance} onAppearanceChange={setAppearance} onAction={setNotice} />
      ) : (
        <div className="desktop">
          <header className="desktop-menu">
            <div className="desktop-menu-brand"><strong>macOS 27</strong><span>Base UI Theme</span></div>
            <nav className="preview-mode-nav" aria-label="预览场景">
              <a href="#components/button"><SfSymbol name="square.grid.2x2" size={14} />组件库</a>
              <a href="#preview/mail" data-active={route.mode === 'mail' || undefined} aria-current={route.mode === 'mail' ? 'page' : undefined}><SfSymbol name="envelope" size={14} />邮件</a>
              <a href="#preview/settings" data-active={route.mode === 'settings' || undefined} aria-current={route.mode === 'settings' ? 'page' : undefined}><SfSymbol name="gearshape" size={14} />系统设置</a>
            </nav>
            <Button className="desktop-appearance" aria-label={appearance === 'light' ? '切换到深色外观' : '切换到浅色外观'} title={appearance === 'light' ? '切换到深色外观' : '切换到浅色外观'} onClick={() => setAppearance((value) => value === 'light' ? 'dark' : 'light')}><SfSymbol name={appearance === 'light' ? 'moon' : 'sun.max'} size={15} /></Button>
          </header>
          {route.mode === 'mail' && <div className={`${mac.windowShadowHost} mail-window-host`}><MailScene onAction={setNotice} appearance={appearance} /></div>}
          {route.mode === 'settings' && <div className={`${mac.windowShadowHost} settings-window-host`}><SettingsScene onAction={setNotice} /></div>}
        </div>
      )}
      {notice && <div className="notice-shadow-host"><div className="notice" role="status"><SfSymbol name="checkmark" size={14} />{notice}</div></div>}
    </Tooltip.Provider>
  );
}

export default App;
