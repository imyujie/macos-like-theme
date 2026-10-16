import { useState } from 'react';
import { Button } from '@base-ui/react/button';
import { Input } from '@base-ui/react/input';
import { Switch } from '@base-ui/react/switch';
import { mac, SfSymbol } from './theme';
import './scenes.css';

type SceneProps = { onAction: (message: string) => void };

function TrafficLights() {
  return <div className="scene-traffic-lights" aria-hidden="true"><i /><i /><i /></div>;
}

function SceneIconButton({ name, label, onClick }: { name: string; label: string; onClick: () => void }) {
  return <Button className="scene-icon-button" aria-label={label} title={label} onClick={onClick}><SfSymbol name={name} size={17} /></Button>;
}

const mailboxes = [
  { id: 'all', label: '所有邮箱', symbol: 'tray.full', count: '' },
  { id: 'inbox', label: '收件箱', symbol: 'tray', count: '' },
  { id: 'drafts', label: '草稿', symbol: 'doc', count: '4' },
  { id: 'sent', label: '已发送', symbol: 'paperplane', count: '' },
] as const;

type MailMessage = { sender: string; subject: string; preview: string; date: string; categories: string[]; body: string[]; poster?: boolean };
const messages: MailMessage[] = [
  { sender: 'TripBudget', subject: 'Your upcoming itinerary', preview: 'Hi Liz, Great news! Everything is locked in for your trip to New York City.', date: '3/30/26', categories: ['shopping', 'news'], body: ['Hi Liz,', 'Great news! Your flights and hotel for New York City are confirmed. We have attached the final itinerary and budget summary.', 'Have a wonderful trip!'] },
  { sender: 'Nisha Kumar', subject: 'Fwd: Airfare for NYC offsite', preview: 'Hi team, As we finalize logistics for the New York offsite, I have pulled together flight options.', date: '2/12/26', categories: ['people', 'messages'], body: ['Hi team,', 'As we finalize logistics for the New York offsite, I have pulled together the flight options and the latest arrival times.', 'Please review them when you have a moment.'] },
  { sender: 'Ryan Notch', subject: 'Re: Manhattan helicopter inquiry', preview: 'Hi Liz, Thanks for reaching out. A helicopter tour of Manhattan is a lovely idea.', date: '1/27/26', categories: ['people', 'messages'], body: ['Hi Liz,', 'Thanks for reaching out. A helicopter tour of Manhattan is a lovely idea. I can reserve a late afternoon flight for your group.', 'Let me know which day works best.'] },
  { sender: 'Fleur Lasseur', subject: 'Fundraiser invite', preview: "Hey Liz, Any chance you’ll be back in the city mid-June? Asking because I’m hosting an arts fundraiser.", date: '2:33 PM', categories: ['people', 'messages'], body: ['Hey Liz,', 'Any chance you’ll be back in the city mid-June? I’m hosting an arts fundraiser at the pier with an exhibition, auction, and music.', 'Let me know if you can join!'], poster: true },
  { sender: 'Eco Lodge', subject: 'Confirmed: Your suite in Brooklyn awaits!', preview: "Hello Liz, We’re thrilled to welcome you to our Brooklyn hotel this spring.", date: '1/20/26', categories: ['shopping'], body: ['Hello Liz,', 'We’re thrilled to welcome you to our Brooklyn hotel this spring. Your suite is reserved and we look forward to seeing you.', 'Your confirmation details are attached.'] },
];

export function MailScene({ onAction }: SceneProps) {
  const [mailbox, setMailbox] = useState('all');
  const [selected, setSelected] = useState(3);
  const [query, setQuery] = useState('New York trip');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const current = messages[selected];
  const visibleMessages = messages.map((message, index) => ({ message, index })).filter(({ message }) => filter === 'all' || message.categories.includes(filter));
  const currentMailbox = mailboxes.find((item) => item.id === mailbox)?.label ?? '所有邮箱';
  const chooseFilter = (nextFilter: string) => {
    setFilter(nextFilter);
    if (nextFilter !== 'all' && !current.categories.includes(nextFilter)) {
      const firstMatch = messages.findIndex((message) => message.categories.includes(nextFilter));
      if (firstMatch !== -1) setSelected(firstMatch);
    }
    setSuggestionsOpen(false);
  };

  return (
    <main className={`reference-window ${mac.window} mail-scene`} aria-label="邮件场景预览">
      <aside className={`mail-sidebar ${mac.sidebarSurface}`}>
        <div className="mail-sidebar-top"><TrafficLights /><SceneIconButton name="sidebar.left" label="侧边栏布局" onClick={() => onAction('邮件侧边栏预览')} /></div>
        <div className="mail-sidebar-section">搜索</div>
        <nav aria-label="邮箱目录" className="mail-sidebar-nav">
          {mailboxes.map((item, index) => (
            <div key={item.id}>
              {index === 1 && <div className="mail-sidebar-section secondary">个人收藏</div>}
              <Button className={`mail-sidebar-item ${mac.sidebarRow}`} data-active={mailbox === item.id || undefined} data-selection="neutral" onClick={() => { setMailbox(item.id); setSuggestionsOpen(false); }}>
                <SfSymbol name={item.symbol} size={19} /><span>{item.label}</span>{item.count && <small>{item.count}</small>}
              </Button>
            </div>
          ))}
        </nav>
        <div className="mail-sidebar-section lower">智能邮箱</div>
        <div className="mail-sidebar-section lower account">iCloud <span>28</span></div>
      </aside>

      <div className="mail-workspace">
        <header className={`mail-toolbar ${mac.toolbarSurface}`}>
          <div className="mail-heading"><strong>搜索</strong><small>{currentMailbox}，{visibleMessages.length} 个结果</small></div>
          <div className="mail-toolbar-actions">
            <div className="scene-icon-group"><SceneIconButton name="line.3.horizontal.decrease" label="筛选" onClick={() => chooseFilter(filter === 'all' ? 'people' : 'all')} /><SceneIconButton name="ellipsis" label="更多操作" onClick={() => onAction('已打开邮件操作')} /></div>
            <SceneIconButton name="square.and.pencil" label="撰写邮件" onClick={() => onAction('新邮件示例')} />
            <div className="scene-icon-group compact"><SceneIconButton name="arrowshape.turn.up.left" label="回复" onClick={() => onAction('回复邮件示例')} /><SceneIconButton name="arrowshape.turn.up.right" label="转发" onClick={() => onAction('转发邮件示例')} /></div>
            <div className="scene-icon-group compact"><SceneIconButton name="archivebox" label="归档" onClick={() => onAction('归档邮件示例')} /><SceneIconButton name="trash" label="删除" onClick={() => onAction('删除邮件示例')} /></div>
          </div>
          <div className="mail-search-area">
            <label className={`mail-search-field ${suggestionsOpen ? 'is-open' : ''}`}>
              <SfSymbol name="magnifyingglass" size={16} />
              <Input aria-label="搜索邮件" value={query} onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); }} onFocus={() => setSuggestionsOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') setSuggestionsOpen(false); }} />
              {query && <Button className="mail-search-clear" aria-label="清除搜索" onClick={() => { setQuery(''); setSuggestionsOpen(false); }}><SfSymbol name="xmark" size={12} /></Button>}
            </label>
            {suggestionsOpen && <div className="mail-search-suggestions-host"><div className="mail-search-suggestions" role="group" aria-label="搜索建议">
              {[
                { symbol: 'magnifyingglass', label: `${query || '搜索'} today` },
                { symbol: 'person.crop.circle', label: `发件人包含：${query || '关键词'}` },
                { symbol: 'envelope', label: `主题包含：${query || '关键词'}` },
                { symbol: 'paperclip', label: `附件名称包含：${query || '关键词'}` },
              ].map((item) => <Button key={item.symbol} className="mail-suggestion" onClick={() => setSuggestionsOpen(false)}><SfSymbol name={item.symbol} size={15} /><span>{item.label}</span></Button>)}
            </div></div>}
          </div>
        </header>

        <div className="mail-content">
          <section className="mail-list-panel" aria-label="邮件列表">
            <div className="mail-filter-row">
              {[
                ['people', 'person.crop.circle'], ['shopping', 'tray'], ['messages', 'bubble.left'], ['news', 'megaphone'], ['all', 'tray.full'],
              ].map(([id, symbol]) => <Button key={id} className="mail-filter-chip" data-active={filter === id || undefined} aria-label={id === 'all' ? '所有邮件' : `筛选 ${id}`} onClick={() => chooseFilter(id)}><SfSymbol name={symbol} size={16} />{id === 'all' && <span>所有邮件</span>}</Button>)}
            </div>
            <div className="mail-list-scroll">
              <div className="mail-list-label">最佳匹配</div>
              {visibleMessages.map(({ message, index }) => <div key={message.sender}>
                {index === 4 && <div className="mail-list-label results">全部结果</div>}
                <Button className="mail-message-row" data-selected={selected === index || undefined} aria-pressed={selected === index} onClick={() => { setSelected(index); setSuggestionsOpen(false); }}>
                  <span className="mail-message-first"><strong>{message.sender}</strong><time>{message.date}</time></span>
                  <span className="mail-message-subject">{message.subject}</span>
                  <span className="mail-message-preview">{message.preview}</span>
                </Button>
              </div>)}
            </div>
          </section>

          <article className="mail-detail-panel">
            <div className="mail-detail-count">1 封邮件</div>
            <div className="mail-detail-sender"><div className="mail-avatar">{current.sender.slice(0, 1)}</div><div><strong>{current.sender}</strong><span>{current.subject}</span><small>收件人：Liz Dizon</small></div></div>
            <div className="mail-detail-body">
              {current.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {current.poster && <div className="mail-poster" aria-label="艺术之夜活动海报"><div className="mail-poster-title">A NIGHT</div><div className="mail-poster-subtitle">FOR THE ARTS</div><div className="mail-poster-orb" /><div className="mail-poster-platform" /></div>}
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

const settingsSections = [
  { label: '个人信息', symbol: 'person.crop.circle', color: 'gray' },
  { label: 'App 与网站', symbol: 'square.grid.2x2', color: 'blue' },
  { label: '允许的联系人', symbol: 'person.crop.circle', color: 'green' },
  { label: '始终允许', symbol: 'checkmark', color: 'green' },
  { label: '屏幕使用时间安排', symbol: 'calendar', color: 'purple' },
  { label: '时间限制', symbol: 'hourglass', color: 'orange' },
  { label: '内容与隐私限制', symbol: 'lock', color: 'red' },
  { label: '通信安全', symbol: 'bubble.left', color: 'blue' },
  { label: '管理屏幕使用时间', symbol: 'lock', color: 'blue' },
];

const scheduleRows = [
  { label: '上学前', time: '8:00 – 8:30', icons: ['bubble.left', 'calendar'] },
  { label: '上课时间', time: '8:30 – 15:00', icons: ['calendar'] },
  { label: '放学后', time: '15:00 – 20:00', icons: ['hourglass', 'paperplane', 'bubble.left', 'calendar'] },
];

export function SettingsScene({ onAction }: SceneProps) {
  const [section, setSection] = useState('屏幕使用时间安排');
  const [enabled, setEnabled] = useState(true);

  return (
    <main className={`reference-window ${mac.window} settings-scene`} aria-label="系统设置场景预览">
      <header className="settings-titlebar"><TrafficLights /><div className="settings-back"><SceneIconButton name="chevron.left" label="返回" onClick={() => onAction('已返回家庭设置')} /><span>家庭</span></div></header>
      <div className="settings-inner-shadow-host"><div className="settings-inner-window">
        <aside className={`settings-sidebar ${mac.sidebarSurface}`}>
          <div className="settings-profile"><div className="settings-avatar">A</div><div><strong>Anneliese Harrison</strong><small>16 岁</small></div></div>
          <nav aria-label="设置目录">
            {settingsSections.map((item) => <Button key={item.label} className={`settings-nav-item ${mac.sidebarRow}`} data-selection="accent" data-active={section === item.label || undefined} onClick={() => setSection(item.label)}>
              <span className={`settings-nav-icon ${item.color}`}><SfSymbol name={item.symbol} size={17} /></span><span>{item.label}</span>
            </Button>)}
          </nav>
        </aside>

        <div className="settings-main">
          {section === '屏幕使用时间安排' ? <>
            <section className={`settings-intro-card ${mac.groupedSurface}`}>
              <div className="settings-intro-heading"><span className="settings-nav-icon purple large"><SfSymbol name="calendar" size={19} /></span><div><strong>屏幕使用时间安排</strong><p>为 Anneliese 设置 App 和网站的使用时间。始终允许的联系人与 App 不受此安排影响。</p></div></div>
              <div className="settings-switch-row"><span>启用安排</span><Switch.Root className={mac.switch.root} checked={enabled} onCheckedChange={setEnabled} aria-label="启用安排"><Switch.Thumb className={mac.switch.thumb} /></Switch.Root></div>
            </section>

            <section className="schedule-section">
              <h2>周一、周二、周三、周五允许使用</h2>
              <div className={`schedule-group ${mac.groupedSurface}`}>
                {scheduleRows.map((row) => <Button key={row.label} className="schedule-row" onClick={() => onAction(`正在编辑“${row.label}”`)}><span><strong>{row.label}</strong><small>{row.time}</small></span><span className="schedule-apps">{row.icons.map((symbol, index) => <span key={`${symbol}-${index}`} className={`schedule-app-icon color-${index}`}><SfSymbol name={symbol} size={15} /></span>)}</span><SfSymbol name="chevron.right" size={12} /></Button>)}
                <div className="schedule-actions"><Button className={mac.button} onClick={() => onAction('编辑适用日期')}>编辑日期…</Button><Button className={mac.button} onClick={() => onAction('添加时间段')}>添加时间段</Button></div>
              </div>
            </section>

            <section className="schedule-section second"><h2>周四允许使用</h2><div className={`schedule-group ${mac.groupedSurface}`}><div className="schedule-row readonly"><span><strong>上学前</strong><small>8:00 – 8:30</small></span><span className="schedule-apps"><span className="schedule-app-icon color-2"><SfSymbol name="bubble.left" size={15} /></span><span className="schedule-app-icon color-0"><SfSymbol name="calendar" size={15} /></span></span><SfSymbol name="chevron.right" size={12} /></div></div></section>
          </> : <section className="settings-placeholder"><span className="settings-nav-icon blue large"><SfSymbol name={settingsSections.find((item) => item.label === section)?.symbol ?? 'gearshape'} size={22} /></span><h2>{section}</h2><p>此场景重点展示侧边栏、标题栏与分组内容的主题样式。</p></section>}
          <div className="settings-footer"><Button className={mac.button} data-variant="primary" onClick={() => onAction('设置已完成')}>完成</Button></div>
        </div>
      </div></div>
    </main>
  );
}
