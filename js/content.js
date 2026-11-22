/* LilNux — lessons, quizzes and missions.
 * Step types: card, quiz, match, order, type, terminal
 * Card text may use <b>, <kbd>, <code>. "more" is an extra tip shown in grown-up mode.
 */
(function () {
  'use strict';

  // helpers for terminal mission checks
  const ran = (last, name, test) => last.some((r) => r.name === name && r.ok && (!test || test(r.args, r)));
  const tried = (last, name, test) => last.some((r) => r.name === name && (!test || test(r.args, r)));
  const flag = (args, ch) => args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(ch)) || (ch === 'a' && args.includes('--all'));
  const H = (sh, p) => sh.homeStr() + (p ? '/' + p : '');

  window.LILNUX_WORLDS = [
    // ------------------------------------------------------------------------------------------
    {
      id: 'meet', title: 'Meet Fedora', emoji: '🐧', color: '#3c6eb4',
      blurb: 'What are Linux, Fedora and GNOME?',
      badge: { emoji: '🐧', name: 'Fedora Friend' },
      steps: [
        { type: 'card', emoji: '👋', title: "Hi! I'm Lil Tux", text: "I'm going to help your whole family learn <b>Fedora Linux</b>. We'll explore the desktop, find files, type real commands and even install games. Right answers earn <b>XP</b> ⭐ and finishing a world earns a <b>badge</b>!" },
        { type: 'card', emoji: '🧠', title: 'What is Linux?', text: 'Every computer needs a boss program that talks to the screen, keyboard, Wi‑Fi and everything else. That boss is called the <b>kernel</b>. <b>Linux</b> is a kernel! A student named Linus Torvalds started it in 1991. Today it runs phones, game consoles, supercomputers… and your computer.', more: 'Android phones, the Steam Deck and most of the web servers on the internet all run the Linux kernel.' },
        { type: 'card', emoji: '🎩', title: 'What is Fedora?', text: 'Linux alone is just the engine. A <b>distribution</b> (or “distro”) adds the rest of the car: apps, a desktop, settings and tools. <b>Fedora</b> is a distro made by thousands of people all over the world. You are using <b>Fedora 44 Workstation</b>.', more: 'Fedora is sponsored by Red Hat. A new version comes out about every 6 months, and each version gets updates for about 13 months — so upgrade at least once a year.' },
        { type: 'card', emoji: '🪟', title: 'What is GNOME?', text: 'The <b>desktop</b> is the part you see and click: windows, the top bar and app icons. Fedora Workstation uses a desktop called <b>GNOME</b> (say “guh‑NOME”). It’s designed to be simple and stay out of your way.' },
        { type: 'card', emoji: '🍪', title: 'Open source = shared recipes', text: 'Fedora is <b>open source</b>. The “recipe” for the software (called <b>source code</b>) is public. Anyone can read it, learn from it, fix it and share it — for free! That’s why so many people help make Linux better.', more: 'Fedora’s four “Foundations” are Freedom, Friends, Features and First.' },
        { type: 'card', emoji: '🔎', title: 'Which Fedora do I have?', text: 'Open the <b>Settings</b> app, then click <b>System</b> → <b>About</b>. You’ll see your Fedora version and your computer’s name. (Later you’ll learn a terminal command for this too!)' },
        { type: 'quiz', q: 'What is the name of the Linux penguin mascot?', options: ['Tux', 'Pingu', 'Gnome', 'Fedora'], answer: 0, explain: 'Tux the penguin has been the Linux mascot since 1996.' },
        { type: 'quiz', q: 'Linux is a…', options: ['Kernel — the core program that runs the hardware', 'Web browser', 'Kind of computer mouse', 'Video game'], answer: 0, explain: 'The kernel is the boss program that talks to all the hardware.' },
        { type: 'quiz', q: 'What is Fedora?', options: ['A Linux distribution (a complete operating system)', 'A brand of laptop', 'A programming language', 'An internet company'], answer: 0, explain: 'Fedora bundles the Linux kernel with a desktop, apps and tools.' },
        { type: 'quiz', q: 'What is the desktop in Fedora Workstation called?', options: ['GNOME', 'Windows', 'Aqua', 'Dashboard'], answer: 0, explain: 'GNOME gives you the top bar, the Activities overview and your app windows.' },
        { type: 'quiz', q: 'What does “open source” mean?', options: ['Anyone can see, change and share the code', 'The computer case has no lid', 'It only works outdoors', 'You must pay every month'], answer: 0, explain: 'Open source software shares its recipe (source code) with everyone.' },
        { type: 'quiz', q: 'About how often does a new version of Fedora come out?', options: ['About every 6 months', 'Every 10 years', 'Every day', 'Never'], answer: 0, explain: 'Fedora releases twice a year, so you always get fresh features.' },
        { type: 'quiz', q: 'Where can you see which Fedora version you have?', options: ['Settings → System → About', 'Inside the Trash', 'On the clock', 'In the Music folder'], answer: 0, explain: 'Settings → System → About shows your version and computer details.' },
      ],
      quests: [
        'Open Settings → System → About and find your Fedora version.',
        'On the same page, find your computer’s Device Name.',
        'Explain to someone in your family what “open source” means.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'desktop', title: 'Desktop Explorer', emoji: '🖥️', color: '#26a269',
      blurb: 'Activities, the Dash, windows and workspaces.',
      badge: { emoji: '🧭', name: 'Desktop Explorer' },
      steps: [
        { type: 'card', emoji: '⌨️', title: 'The Super key', text: 'Find the key with the Windows logo on it — on Linux we call it the <b>Super</b> key. Press <kbd>Super</kbd> to open the <b>Activities overview</b>. You’ll see your open windows, and you can just <b>start typing</b> to search for any app, file or setting!' },
        { type: 'card', emoji: '🔝', title: 'The top bar', text: 'Look at the very top of the screen.<br>• <b>Left:</b> the Activities button (little dots for your workspaces).<br>• <b>Middle:</b> the clock — click it for the calendar and notifications.<br>• <b>Right:</b> the system menu with Wi‑Fi, sound, battery, Dark Style and the ⏻ power button.' },
        { type: 'card', emoji: '🚀', title: 'The Dash & the app grid', text: 'In the overview, the row of icons at the bottom is the <b>Dash</b> — your favourite apps. The grid button at its end (or <kbd>Super</kbd>+<kbd>A</kbd>) shows <b>all</b> your apps. Right‑click any app and choose <b>Pin to Dash</b> to keep it handy.' },
        { type: 'card', emoji: '🪟', title: 'Wrangling windows', text: 'Double‑click a window’s title bar to make it fill the screen. <kbd>Super</kbd>+<kbd>←</kbd> or <kbd>Super</kbd>+<kbd>→</kbd> snaps a window to half the screen — great for side‑by‑side! <kbd>Alt</kbd>+<kbd>Tab</kbd> switches apps, and <kbd>Super</kbd>+<kbd>H</kbd> hides a window.', more: 'GNOME has no minimize button by default. If you miss it, install the “Tweaks” app (package gnome-tweaks) and turn it on under Windows.' },
        { type: 'card', emoji: '🗂️', title: 'Workspaces', text: 'Workspaces are like extra desks. Put games on one and homework on another! <kbd>Super</kbd>+<kbd>Page Down</kbd> and <kbd>Super</kbd>+<kbd>Page Up</kbd> move between them. GNOME adds a fresh empty one automatically whenever you need it.', more: 'Add Shift to take the current window with you: Super+Shift+Page Down.' },
        { type: 'card', emoji: '⚙️', title: 'Settings & screenshots', text: 'The <b>Settings</b> app changes Wi‑Fi, Bluetooth, displays, sound, users and your wallpaper (under <b>Appearance</b>). Press <kbd>Print Screen</kbd> to take a screenshot — they’re saved in <b>Pictures → Screenshots</b>. Press <kbd>Super</kbd>+<kbd>L</kbd> to lock the screen.' },
        { type: 'quiz', q: 'What happens when you press the Super key?', options: ['The Activities overview opens', 'The computer turns off', 'All windows close', 'The volume goes up'], answer: 0, explain: 'Super opens Activities — then just start typing to search.' },
        { type: 'quiz', q: 'Where do you click to power off or restart the computer?', options: ['The system menu in the top‑right corner', 'The clock in the middle', 'The Trash', 'The bottom of the Dash'], answer: 0, explain: 'Top‑right menu → the ⏻ power button → Power Off or Restart.' },
        { type: 'quiz', q: 'You opened Activities. What’s the fastest way to start the Files app?', options: ['Type “Files” and press Enter', 'Restart the computer', 'Unplug the keyboard', 'Press Print Screen'], answer: 0, explain: 'Typing to search is the GNOME superpower!' },
        { type: 'quiz', q: 'Where do you change your wallpaper?', options: ['Settings → Appearance', 'The Downloads folder', 'The clock menu', 'The Terminal only'], answer: 0, explain: 'Settings → Appearance lets you pick a background and Light or Dark style.' },
        { type: 'quiz', q: 'Where are your screenshots saved?', options: ['Pictures → Screenshots', 'Music', 'They disappear', 'The Trash'], answer: 0, explain: 'Look in your Pictures folder, inside Screenshots.' },
        { type: 'match', title: 'Match each shortcut to what it does', pairs: [
          ['<kbd>Super</kbd>', 'Open the Activities overview'],
          ['<kbd>Super</kbd>+<kbd>A</kbd>', 'Show all apps'],
          ['<kbd>Alt</kbd>+<kbd>Tab</kbd>', 'Switch between apps'],
          ['<kbd>Super</kbd>+<kbd>L</kbd>', 'Lock the screen'],
          ['<kbd>Print Screen</kbd>', 'Take a screenshot'],
          ['<kbd>Super</kbd>+<kbd>←</kbd>', 'Snap window to the left half'],
        ] },
        { type: 'order', title: 'Put the steps in order: change your wallpaper', items: ['Press the Super key', 'Type “Settings”', 'Press Enter', 'Click “Appearance”', 'Pick a background you like'] },
      ],
      quests: [
        'Press Super, type “Files” and press Enter.',
        'Pin your favourite app to the Dash (right‑click → Pin to Dash).',
        'Turn on Dark Style from the top‑right menu (then turn it off again if you like).',
        'Snap two windows side by side with Super+← and Super+→.',
        'Take a screenshot with Print Screen and find it in Pictures → Screenshots.',
        'Change your wallpaper in Settings → Appearance.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'files', title: 'Files & Folders', emoji: '📁', color: '#e5a50a',
      blurb: 'Your Home folder, the file tree and hidden files.',
      badge: { emoji: '🗃️', name: 'Folder Finder' },
      steps: [
        { type: 'card', emoji: '📁', title: 'Meet the Files app', text: 'The <b>Files</b> app lets you look through your folders by clicking. Open it from Activities by typing <b>Files</b>. Double‑click a folder to go inside; use the ← arrow to go back.', more: 'Ctrl+L lets you type a path like /home/yourname/Documents. Ctrl+D bookmarks the current folder in the sidebar. The app’s technical name is Nautilus.' },
        { type: 'card', emoji: '🏠', title: 'Your Home folder', text: 'Each person has a <b>Home</b> folder for their stuff, with <b>Desktop, Documents, Downloads, Music, Pictures</b> and <b>Videos</b> inside. Its real address is <code>/home/yourname</code>, and it has a nickname: <code>~</code> (called “tilde”).', more: 'Each user account gets its own private Home folder — one great reason to give every family member their own account.' },
        { type: 'card', emoji: '🌳', title: 'One big tree', text: 'Windows has drives like <code>C:</code>. Linux has <b>one big tree</b> of folders. The very top is called <b>root</b> and is written as a single slash: <code>/</code>. Paths use forward slashes, like <code>/home/sam/Pictures/cat.jpg</code>.' },
        { type: 'card', emoji: '🙈', title: 'Hidden files', text: 'Files whose names start with a dot, like <code>.bashrc</code>, are <b>hidden</b>. They usually hold settings. In Files, press <kbd>Ctrl</kbd>+<kbd>H</kbd> to show or hide them.' },
        { type: 'card', emoji: '🔠', title: 'BIG and small letters matter!', text: 'Linux is <b>case‑sensitive</b>: <code>Photo.jpg</code> and <code>photo.jpg</code> are two different files! Also, a file name can’t contain a <code>/</code> because that separates folders.' },
        { type: 'card', emoji: '🔌', title: 'USB sticks & the Trash', text: 'Plug in a USB stick and it appears in the Files sidebar. Click the ⏏ eject button before unplugging it. Deleted files go to the <b>Trash</b>, where you can restore them. <kbd>Shift</kbd>+<kbd>Delete</kbd> deletes forever — careful!', more: 'USB drives are mounted under /run/media/yourname/.' },
        { type: 'quiz', q: 'What is the very top folder of the Linux tree called, and how is it written?', options: ['Root, written as /', 'C: drive', 'Home, written as #', 'Desktop, written as *'], answer: 0, explain: 'Everything on Linux lives somewhere under / (root).' },
        { type: 'quiz', q: 'What does ~ (tilde) mean?', options: ['Your Home folder', 'The Trash', 'A secret password', 'The internet'], answer: 0, explain: '~ is the nickname for /home/yourname.' },
        { type: 'quiz', q: 'Hidden files have names that start with…', options: ['A dot (.)', 'An exclamation mark (!)', 'The letter H', 'A number'], answer: 0, explain: 'Like .bashrc. Press Ctrl+H in Files to see them.' },
        { type: 'quiz', q: 'Are “Photo.jpg” and “photo.jpg” the same file on Linux?', options: ['No — Linux treats BIG and small letters as different', 'Yes, always', 'Only on Tuesdays', 'Only if they are pictures'], answer: 0, explain: 'Linux is case‑sensitive, so those are two different names.' },
        { type: 'quiz', q: 'Where do files from the web browser usually go?', options: ['Downloads', 'Music', 'Templates', 'The root folder /'], answer: 0, explain: 'Firefox saves downloads into ~/Downloads.' },
        { type: 'quiz', q: 'Oops! You deleted a drawing in the Files app. What can you do?', options: ['Open the Trash and restore it', 'Nothing, it’s gone forever', 'Buy a new computer', 'Turn the screen upside down'], answer: 0, explain: 'Files deleted with the Delete key go to the Trash first. Right‑click → Restore.' },
        { type: 'order', title: 'Put the steps in order: make a new folder', items: ['Open the Files app', 'Go into Pictures', 'Right‑click an empty space', 'Choose “New Folder…”', 'Type a name and click Create'] },
      ],
      quests: [
        'Make a folder called “Family Photos” inside Pictures.',
        'Press Ctrl+H in Files to show hidden files, then press it again to hide them.',
        'Bookmark a folder you like with Ctrl+D so it shows in the sidebar.',
        'Delete a test file, then restore it from the Trash.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'terminal', title: 'Terminal Town', emoji: '⌨️', color: '#5e5c64',
      blurb: 'Your first real commands: pwd, ls, cd, cat…',
      badge: { emoji: '⌨️', name: 'Terminal Tourist' },
      steps: [
        { type: 'card', emoji: '💻', title: 'The Terminal', text: 'The <b>Terminal</b> lets you talk to your computer by typing commands. It looks old‑school, but it’s a superpower: some jobs take one line instead of twenty clicks! Open it from Activities by typing <b>Terminal</b>.', more: 'Fedora’s terminal app is called Ptyxis, and the program that reads your commands is the bash shell.' },
        { type: 'card', emoji: '👀', title: 'Reading the prompt', text: 'The <b>prompt</b> tells you who and where you are:<br><code>[sam@fedora ~]$</code><br>means user <b>sam</b> on computer <b>fedora</b>, in the <b>~</b> (home) folder. The <code>$</code> means “I’m ready — type something!”' },
        { type: 'card', emoji: '🧩', title: 'Commands, options & names', text: 'A command is a short word like <code>ls</code>. You can add <b>options</b> that start with a dash, and <b>names</b> of things to work on:<br><code>ls -a Documents</code> = “list everything, even hidden files, in Documents.” Press <kbd>Enter</kbd> to run it. Spaces matter!' },
        { type: 'card', emoji: '🗺️', title: 'Your first commands', text: '<code>pwd</code> — where am I?<br><code>ls</code> — what’s here?<br><code>cd Folder</code> — go into a folder (<code>cd ..</code> goes up, <code>cd</code> goes home)<br><code>cat file</code> — show what’s inside a file<br><code>mkdir name</code> — make a folder<br><code>touch name</code> — make an empty file<br><code>echo "hi" &gt; file</code> — write text into a file' },
        { type: 'card', emoji: '🛟', title: 'You can’t break anything!', text: 'The next terminal is <b>pretend</b>, so experiment as much as you like. Type <code>help</code> if you’re stuck, or press 💡 for a hint. In a real terminal, copy and paste use <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>.' },
        { type: 'terminal', title: 'Welcome to Terminal Town', missions: [
          { goal: 'Find out where you are. Print the working directory.', hint: 'pwd', check: (sh, last) => ran(last, 'pwd'), done: 'That’s the full address of your Home folder!' },
          { goal: 'Look around: list the files and folders here.', hint: 'ls', check: (sh, last) => ran(last, 'ls'), done: 'Blue names are folders. White names are files.' },
          { goal: 'Walk into the Documents folder.', hint: 'cd Documents', check: (sh) => sh.cwdStr() === H(sh, 'Documents'), done: 'See how the prompt changed to “Documents”?' },
          { goal: 'Read the file called notes.txt.', hint: 'cat notes.txt', check: (sh, last) => ran(last, 'cat', (a) => a.some((x) => x.endsWith('notes.txt'))), done: '<code>cat</code> prints what’s inside a text file.' },
          { goal: 'Go back home. (Hint: <code>cd ..</code> goes up one folder, plain <code>cd</code> goes straight home.)', hint: 'cd ..', check: (sh) => sh.cwdStr() === H(sh), done: 'Home sweet home: ~' },
          { goal: 'Make a new folder called games.', hint: 'mkdir games', check: (sh) => sh.isDir(H(sh, 'games')), done: 'You built a folder with one word!' },
          { goal: 'Make an empty file called highscores.txt inside the games folder.', hint: 'touch games/highscores.txt', check: (sh) => sh.isFile(H(sh, 'games/highscores.txt')), done: 'The / means “inside”: games/highscores.txt' },
          { goal: 'Write a message into a new file called hello.txt in your Home folder.', hint: 'echo "Linux is fun" > hello.txt', check: (sh) => !!(sh.read(H(sh, 'hello.txt')) || '').trim(), done: 'The <code>&gt;</code> arrow sends text into a file.' },
          { goal: 'Read your hello.txt file to check it worked.', hint: 'cat hello.txt', check: (sh, last) => ran(last, 'cat', (a) => a.some((x) => x.endsWith('hello.txt'))), done: 'You are officially writing files from the terminal!' },
          { goal: 'Clean up the screen.', hint: 'clear', check: (sh, last) => ran(last, 'clear'), done: 'Squeaky clean! (Ctrl+L does the same thing.)' },
        ] },
        { type: 'quiz', q: 'What does the pwd command do?', options: ['Shows the folder you are in', 'Changes your password', 'Prints a picture', 'Turns off the computer'], answer: 0, explain: 'pwd = print working directory.' },
        { type: 'quiz', q: 'Which command moves you into another folder?', options: ['cd', 'ls', 'cat', 'pwd'], answer: 0, explain: 'cd = change directory.' },
        { type: 'quiz', q: 'What does “cd ..” do?', options: ['Goes up one folder', 'Deletes two files', 'Makes a folder called ..', 'Nothing'], answer: 0, explain: '.. always means “the folder above this one”.' },
        { type: 'quiz', q: 'In the prompt [sam@fedora ~]$, what does the ~ mean?', options: ['Sam is in the Home folder', 'Sam is sad', 'The computer is wavy', 'It’s a typo'], answer: 0, explain: '~ is the nickname for the Home folder.' },
      ],
      quests: [
        'Open the real Terminal app from Activities (type “Terminal”).',
        'Type pwd and then ls in the real Terminal.',
        'Type cat /etc/fedora-release to see your Fedora version.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'castle', title: 'Command Castle', emoji: '🏰', color: '#9141ac',
      blurb: 'Copy, move, delete, wildcards, Tab and scripts.',
      badge: { emoji: '🧙', name: 'Command Wizard' },
      steps: [
        { type: 'card', emoji: '📋', title: 'cp and mv', text: '<code>cp</code> <b>copies</b>: <code>cp FROM TO</code>.<br><code>mv</code> <b>moves</b> — and it’s also how you <b>rename</b>: <code>mv old.txt new.txt</code>.<br>If TO is a folder, the file goes inside it.' },
        { type: 'card', emoji: '🗑️', title: 'rm deletes — for real', text: '<code>rm file</code> deletes a file. <code>rm -r folder</code> deletes a folder and <b>everything</b> inside.<br>⚠️ There’s <b>no Trash</b> in the terminal — gone is gone! Always double‑check before pressing Enter.' },
        { type: 'card', emoji: '✨', title: 'Wildcards', text: 'A <code>*</code> means “anything”. <code>*.jpg</code> matches every name ending in .jpg. So <code>rm *.tmp</code> deletes all the .tmp files at once, and <code>ls *.txt</code> lists only text files.' },
        { type: 'card', emoji: '⚡', title: 'Tab, arrows and Ctrl+C', text: 'Press <kbd>Tab</kbd> and the terminal finishes a file or folder name for you — fewer typos! Press <kbd>↑</kbd> to bring back your last command. <code>history</code> lists them all. <kbd>Ctrl</kbd>+<kbd>C</kbd> stops a command that’s running.' },
        { type: 'card', emoji: '🔐', title: 'Permissions & scripts', text: 'Every file has permissions: <b>r</b>ead, <b>w</b>rite and e<b>x</b>ecute (run). <code>ls -l</code> shows them like <code>-rwxr-xr-x</code>. A <b>script</b> is a file full of commands. To make it runnable: <code>chmod +x magic.sh</code>, then run it with <code>./magic.sh</code>.', more: 'The three rwx groups are for the owner, the group and everyone else. The ./ means “the file right here in this folder”.' },
        { type: 'card', emoji: '🔎', title: 'grep and man', text: '<code>grep word file</code> finds every line that contains a word. <code>man ls</code> opens the manual for any command (in a real terminal, press <kbd>q</kbd> to quit the manual).' },
        { type: 'terminal', title: 'Quests in Command Castle', missions: [
          { goal: 'A treasure is hidden in your Home folder! List ALL files, even hidden ones.', hint: 'ls -a', check: (sh, last) => ran(last, 'ls', (a) => flag(a, 'a') || flag(a, 'A')), done: 'See the names starting with a dot? Those are hidden.' },
          { goal: 'Read the hidden treasure file.', hint: 'cat .secret-treasure.txt', check: (sh, last) => ran(last, 'cat', (a) => a.some((x) => x.includes('.secret-treasure'))), done: '🏴‍☠️ Treasure found! Remember the magic word…' },
          { goal: 'Copy Documents/shopping-list.txt to the Desktop folder.', hint: 'cp Documents/shopping-list.txt Desktop/', check: (sh) => sh.isFile(H(sh, 'Desktop/shopping-list.txt')), done: 'Now there are two copies of the list.' },
          { goal: 'IMG_0042.jpg in Downloads is a puppy picture. Move it into Pictures and rename it puppy.jpg — in one command!', hint: 'mv Downloads/IMG_0042.jpg Pictures/puppy.jpg', check: (sh) => sh.isFile(H(sh, 'Pictures/puppy.jpg')) && !sh.exists(H(sh, 'Downloads/IMG_0042.jpg')), done: '🐶 mv moved AND renamed it.' },
          { goal: 'Downloads has 3 junk files ending in .tmp. Delete them all at once with a wildcard.', hint: 'rm Downloads/*.tmp', check: (sh) => ['junk-1.tmp', 'junk-2.tmp', 'junk-3.tmp'].every((f) => !sh.exists(H(sh, 'Downloads/' + f))), done: 'Poof! The * matched all three.' },
          { goal: 'Which recipes need cheese? Search Documents/recipes.txt for the word cheese.', hint: 'grep cheese Documents/recipes.txt', check: (sh, last) => ran(last, 'grep', (a) => a.some((x) => /cheese/i.test(x))), done: '🧀 grep found every cheesy line.' },
          { goal: 'There’s a script called magic.sh. Try running it with ./magic.sh', hint: './magic.sh', check: (sh, last) => tried(last, './magic.sh') || tried(last, 'magic.sh', () => true) || last.some((r) => r.name.endsWith('magic.sh')), done: 'Uh oh — “Permission denied”? Let’s fix that next. (If it worked, you’re already ahead!)' },
          { goal: 'Give magic.sh permission to run (make it executable).', hint: 'chmod +x magic.sh', check: (sh) => { const n = sh.get(H(sh, 'magic.sh')); return !!n && !!(n.mode & 0o100); }, done: 'Try <code>ls</code> — the script is green now. Green = runnable.' },
          { goal: 'Now run the magic script!', hint: './magic.sh', check: (sh) => sh.flags.scriptRan === 'magic.sh', done: '✨ Your first script ran!' },
          { goal: 'Use Tab! Type <code>cd Mu</code> then press the <kbd>Tab</kbd> key (on a phone, the Tab button under the terminal) to finish the word, then press Enter.', hint: 'cd Mu  (then press Tab, then Enter)', check: (sh) => sh.cwdStr() === H(sh, 'Music') && sh.flags.tabUsed, done: 'Tab saves typing AND typos.' },
          { goal: 'Show the list of every command you’ve typed so far.', hint: 'history', check: (sh, last) => ran(last, 'history'), done: 'Tip: press ↑ to bring back old commands.' },
          { goal: 'Read the manual page for ls.', hint: 'man ls', check: (sh, last) => ran(last, 'man'), done: 'Every command has a manual. RTFM = “read the friendly manual” 😉' },
        ] },
        { type: 'quiz', q: 'How do you rename old.txt to new.txt?', options: ['mv old.txt new.txt', 'rename the file by shouting', 'cp new.txt', 'cat old.txt new'], answer: 0, explain: 'mv moves, and moving to a new name is renaming.' },
        { type: 'quiz', q: 'Does rm send files to the Trash?', options: ['No — they are deleted right away', 'Yes, always', 'Only pictures', 'Only on weekends'], answer: 0, explain: 'The terminal has no undo. Double‑check before using rm!' },
        { type: 'quiz', q: 'What does * mean in ls *.png?', options: ['Anything — so all names ending in .png', 'A star‑shaped file', 'Delete everything', 'Multiply'], answer: 0, explain: 'Wildcards save loads of typing.' },
        { type: 'quiz', q: 'Which key finishes file names for you?', options: ['Tab', 'Escape', 'Space', 'Caps Lock'], answer: 0, explain: 'Press Tab twice to see all the choices when there are several.' },
        { type: 'quiz', q: 'What does chmod +x do?', options: ['Lets a file run as a program', 'Deletes a file', 'Makes a file bigger', 'Hides a file'], answer: 0, explain: 'x = execute permission.' },
      ],
      quests: [
        'In the real Terminal, press Tab to finish a folder name.',
        'Press ↑ in the real Terminal to repeat your last command.',
        'Run man ls in the real Terminal, then press q to quit.',
        'Run ls -l in the real Terminal and spot the rwx permissions.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'software', title: 'Software Shop', emoji: '📦', color: '#e66100',
      blurb: 'Install apps & games with Software, dnf and Flatpak.',
      badge: { emoji: '🛍️', name: 'Package Pro' },
      steps: [
        { type: 'card', emoji: '🛍️', title: 'The Software app', text: 'The easiest way to get new apps and games is the <b>Software</b> app. Search for something, click <b>Install</b>, done! It also tells you when updates are ready.' },
        { type: 'card', emoji: '📦', title: 'Packages & repositories', text: 'Programs on Linux come in <b>packages</b>. Packages live on online shelves called <b>repositories</b>. Fedora’s own repositories are checked by the Fedora team, so the software there is safe and free.', more: 'Some extras, like certain video codecs or NVIDIA drivers, live in RPM Fusion — a community repository you can enable later.' },
        { type: 'card', emoji: '🦸', title: 'sudo = admin powers', text: 'Installing changes the whole computer, so you need permission. <code>sudo</code> means “do this as the admin.” It asks for <b>your</b> password — and the letters stay <b>invisible</b> while you type. That’s normal! Just type it and press Enter.', more: 'Only Administrator accounts can use sudo. In Settings → System → Users you can make kids’ accounts Standard users.' },
        { type: 'card', emoji: '🧰', title: 'dnf: the terminal app store', text: '<code>dnf search word</code> — find packages<br><code>sudo dnf install name</code> — install<br><code>sudo dnf remove name</code> — remove<br><code>sudo dnf upgrade</code> — update everything<br>dnf asks <b>Is this ok [y/N]</b> — type <kbd>y</kbd> and press Enter.', more: 'Fedora uses dnf5, a faster rewrite. Run “sudo dnf upgrade --refresh” to make sure the package lists are brand new.' },
        { type: 'card', emoji: '🧳', title: 'Flatpak & Flathub', text: '<b>Flatpaks</b> are apps that come in their own sealed box (a sandbox), so they can’t mess with the rest of your computer. <b>Flathub</b> is a huge Flatpak store with games like SuperTuxKart. Command: <code>flatpak install flathub app.id</code>', more: 'If Flathub apps don’t show up in Software, open Software’s menu → Software Repositories and enable third‑party repositories. Flatpak may pop up a password window instead of using sudo.' },
        { type: 'terminal', title: 'Shopping in the terminal', missions: [
          { goal: 'Update all your software. Use sudo, type any password (it stays invisible!), then answer y.', hint: 'sudo dnf upgrade', check: (sh) => !!sh.flags.upgraded, done: 'Your computer is up to date! 🛡️' },
          { goal: 'Search for a package called cowsay.', hint: 'dnf search cowsay', check: (sh, last) => ran(last, 'dnf', (a) => a.includes('search')), done: 'Found it! Its description says what it does.' },
          { goal: 'Install cowsay.', hint: 'sudo dnf install cowsay', check: (sh) => sh.installed.has('cowsay'), done: 'Installed! Notice sudo didn’t ask for the password again — it remembers for a few minutes.' },
          { goal: 'Make the cow say something!', hint: 'cowsay Hello family!', check: (sh, last) => ran(last, 'cowsay') || ran(last, 'cowthink'), done: 'Moooo! 🐮' },
          { goal: 'The fortune command comes in a package called fortune-mod. Install it, then run fortune.', hint: 'sudo dnf install fortune-mod   then   fortune', check: (sh, last) => ran(last, 'fortune'), done: 'Package names and command names aren’t always the same!' },
          { goal: 'Install a game from Flathub. (Try SuperTuxKart: net.supertuxkart.SuperTuxKart)', hint: 'flatpak install flathub net.supertuxkart.SuperTuxKart', check: (sh) => sh.flatpaks.size > 0, done: '🏎️ Vroom! On real Fedora it would appear in your app grid.' },
          { goal: 'List the Flatpak apps you have installed.', hint: 'flatpak list', check: (sh, last) => ran(last, 'flatpak', (a) => a.includes('list')), done: 'Tip: <code>flatpak update</code> updates them all.' },
        ] },
        { type: 'quiz', q: 'What’s the easiest way for the family to install a game?', options: ['Open the Software app, search, click Install', 'Download random files from a website', 'Copy it from a friend’s USB stick', 'Type random letters in the Terminal'], answer: 0, explain: 'Software (and Fedora’s repositories) keep things safe and simple.' },
        { type: 'quiz', q: 'What does sudo do?', options: ['Runs a command with admin powers', 'Makes the computer go to sleep', 'Opens the Software app', 'Plays a sound'], answer: 0, explain: 'sudo = “superuser do”.' },
        { type: 'quiz', q: 'You type your password after sudo, but nothing appears on screen. What’s going on?', options: ['That’s normal — the password is hidden for safety', 'The keyboard is broken', 'You need a new password', 'Linux is ignoring you'], answer: 0, explain: 'Just type it and press Enter.' },
        { type: 'quiz', q: 'dnf asks “Is this ok [y/N]:”. What do you type to say yes?', options: ['y and press Enter', 'Nothing, just wait', 'N', 'Ctrl+C'], answer: 0, explain: 'The capital N means pressing Enter alone answers No.' },
        { type: 'quiz', q: 'What is Flathub?', options: ['A big store of Flatpak apps', 'A flat hubcap', 'A kind of USB cable', 'A Linux virus'], answer: 0, explain: 'Flathub has thousands of sandboxed apps and games.' },
        { type: 'quiz', q: 'Which command updates all your Fedora software from the terminal?', options: ['sudo dnf upgrade', 'ls -a', 'cat update', 'mkdir upgrade'], answer: 0, explain: 'You can also click Update in the Software app.' },
        { type: 'order', title: 'Put the steps in order: install an app with Software', items: ['Press the Super key', 'Type “Software” and press Enter', 'Search for the app', 'Click on the app', 'Click Install'] },
      ],
      quests: [
        'Open the Software app and browse the “Play” category.',
        'Install a game the whole family likes (SuperTuxKart is great!).',
        'Check the Updates tab in Software.',
        'With a grown‑up: run sudo dnf upgrade --refresh in the real Terminal.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'safety', title: 'Safety Shield', emoji: '🛡️', color: '#c01c28',
      blurb: 'Accounts, passwords, updates and staying safe.',
      badge: { emoji: '🛡️', name: 'Safety Shield' },
      steps: [
        { type: 'card', emoji: '👨‍👩‍👧‍👦', title: 'One account each', text: 'Give every family member their own account in <b>Settings → System → Users</b>. Everyone gets their own Home folder, wallpaper and files. Kids can be <b>Standard</b> users, so they can’t change important system stuff.' },
        { type: 'card', emoji: '🔒', title: 'Lock it!', text: 'Stepping away? Press <kbd>Super</kbd>+<kbd>L</kbd> to lock the screen. Use a password that’s easy for you to remember but hard for others to guess, and don’t share it with friends.' },
        { type: 'card', emoji: '🔄', title: 'Updates are shields', text: 'Updates fix bugs and close security holes. When Software says updates are ready, install them and restart. Fedora applies most updates during a restart, so nothing breaks while you’re working.' },
        { type: 'card', emoji: '⚠️', title: 'Think before you paste', text: 'Never copy a command from a random website or video and run it — especially with <code>sudo</code> — unless a grown‑up you trust understands it. A bad command can delete files or install something nasty. <code>rm -rf</code> is one of the scariest!' },
        { type: 'card', emoji: '🛡️', title: 'Fedora’s built‑in guards', text: 'Fedora has a <b>firewall</b> that blocks unwanted visitors from the network, and <b>SELinux</b>, a security guard that stops programs from touching things they shouldn’t. Leave them both switched on!' },
        { type: 'card', emoji: '💾', title: 'Back up your treasures', text: 'Computers can break and files can be deleted. Copy important things (photos!) to a USB drive, or use a backup app like <b>Pika Backup</b> or <b>Déjà Dup</b> from the Software app.' },
        { type: 'terminal', title: 'Root’s secret room', missions: [
          { goal: 'Try to read the admin’s file: /root/secret.txt', hint: 'cat /root/secret.txt', check: (sh, last) => tried(last, 'cat', (a, r) => !r.sudo && a.some((x) => x.includes('root/secret'))), done: '“Permission denied” — normal users can’t peek at the admin’s files. That’s a good thing!' },
          { goal: 'Now use your admin powers to read it.', hint: 'sudo cat /root/secret.txt', check: (sh, last) => ran(last, 'cat', (a, r) => r.sudo && a.some((x) => x.includes('root/secret'))), done: 'With great power comes great responsibility!' },
          { goal: 'See who owns /etc/fedora-release with a long listing.', hint: 'ls -l /etc/fedora-release', check: (sh, last) => ran(last, 'ls', (a) => flag(a, 'l')), done: 'It belongs to <b>root</b> — system files are owned by the admin.' },
          { goal: 'Keep the shields up — update everything!', hint: 'sudo dnf upgrade', check: (sh) => !!sh.flags.upgraded, done: '🛡️ All patched!' },
        ] },
        { type: 'quiz', q: 'Why should each family member have their own account?', options: ['Everyone gets their own files and settings', 'It makes the computer faster', 'Computers need at least 5 accounts', 'So the Trash is bigger'], answer: 0, explain: 'Separate accounts keep everyone’s stuff private and tidy.' },
        { type: 'quiz', q: 'Which shortcut locks your screen?', options: ['Super+L', 'Ctrl+C', 'Alt+F4', 'Super+A'], answer: 0, explain: 'L for Lock!' },
        { type: 'quiz', q: 'A video says “Paste this command with sudo to get free game coins!” What should you do?', options: ['Don’t run it — ask a trusted grown‑up', 'Run it right away', 'Run it twice to get double coins', 'Share it with all your friends'], answer: 0, explain: 'Commands from strangers can do real damage. When in doubt, don’t!' },
        { type: 'quiz', q: 'Why are updates important?', options: ['They fix bugs and security holes', 'They change your wallpaper', 'They delete your photos', 'They aren’t important'], answer: 0, explain: 'Updated computers are much harder to attack.' },
        { type: 'quiz', q: 'What is SELinux?', options: ['A security guard built into Fedora', 'A video game', 'A type of keyboard', 'A web browser'], answer: 0, explain: 'SELinux stops programs from going where they shouldn’t.' },
        { type: 'quiz', q: 'What is the best way to protect the family photos?', options: ['Keep a backup copy on a USB drive or backup app', 'Print them and delete the files', 'Rename them', 'Hide them with a dot'], answer: 0, explain: 'Backups save the day when something goes wrong.' },
      ],
      quests: [
        'Lock your screen with Super+L, then log back in.',
        'Grown‑ups: make sure each family member has their own account (Settings → System → Users).',
        'Install any waiting updates from the Software app.',
        'Copy your favourite photos to a USB stick as a backup.',
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: 'boss', title: 'Linux Legend', emoji: '🏆', color: '#1c71d8',
      blurb: 'The final boss: show off everything you learned!',
      badge: { emoji: '🏆', name: 'Linux Legend' },
      steps: [
        { type: 'card', emoji: '🏆', title: 'The Final Challenge', text: 'You’ve explored the desktop, tamed the terminal and visited the Software Shop. Now it’s time to prove you’re a <b>Linux Legend</b>! Answer the questions and finish the final missions. You can do it! 🐧' },
        { type: 'type', q: 'Type the command that shows which folder you are in.', accept: ['pwd'], hint: 'Three letters: print working directory.' },
        { type: 'type', q: 'Type the command that lists ALL files, including hidden ones.', accept: [/^ls\s+(-a|-A|-la|-al|-lA|-Al|--all)$/], hint: 'ls plus an option that starts with a dash…', show: 'ls -a' },
        { type: 'type', q: 'Type the command that goes up one folder.', accept: ['cd ..'], hint: 'cd, a space, and two dots.' },
        { type: 'type', q: 'Type the command that installs the package “sl”.', accept: [/^sudo\s+dnf\s+(-y\s+)?install\s+(-y\s+)?sl(\s+-y)?$/], hint: 'You need admin powers + dnf + install.', show: 'sudo dnf install sl' },
        { type: 'type', q: 'Type the command that updates all the software on Fedora.', accept: [/^sudo\s+dnf\s+(upgrade|update)(\s+(--refresh|-y))*$/], hint: 'sudo dnf …', show: 'sudo dnf upgrade' },
        { type: 'quiz', q: 'Which key opens the Activities overview?', options: ['Super', 'Shift', 'Escape', 'Enter'], answer: 0, explain: 'The Super key — your launchpad for everything.' },
        { type: 'quiz', q: 'What does the / symbol at the start of /home/sam mean?', options: ['Start at root, the top of the tree', 'Divide by home', 'A hidden file', 'Nothing'], answer: 0, explain: 'Paths that start with / begin at the root of the tree.' },
        { type: 'match', title: 'Match each command to its job', pairs: [
          ['<code>ls</code>', 'List files'],
          ['<code>cd</code>', 'Change folder'],
          ['<code>cat</code>', 'Show a file'],
          ['<code>mkdir</code>', 'Make a folder'],
          ['<code>rm</code>', 'Delete (no Trash!)'],
          ['<code>sudo</code>', 'Admin powers'],
        ] },
        { type: 'terminal', title: 'The Legendary Missions', missions: [
          { goal: 'Make a folder called fedora-fan and go inside it. (Bonus: do it in one line with <code>&amp;&amp;</code>!)', hint: 'mkdir fedora-fan && cd fedora-fan', check: (sh) => sh.cwdStr() === H(sh, 'fedora-fan'), done: '&& means “if that worked, then do this”.' },
          { goal: 'Write your name into a file called me.txt (right here in fedora-fan).', hint: 'echo "My name is ..." > me.txt', check: (sh) => !!(sh.read(H(sh, 'fedora-fan/me.txt')) || '').trim(), done: 'Signed and saved!' },
          { goal: 'Copy me.txt to your Desktop folder. (Remember: ~ means Home.)', hint: 'cp me.txt ~/Desktop/', check: (sh) => sh.isFile(H(sh, 'Desktop/me.txt')), done: 'Copy master!' },
          { goal: 'Check which Fedora version this computer has.', hint: 'cat /etc/fedora-release', check: (sh, last) => ran(last, 'cat', (a) => a.some((x) => x.includes('release'))), done: 'Forty Four! 🎉' },
          { goal: 'Install BOTH cowsay and fortune-mod in one command.', hint: 'sudo dnf install cowsay fortune-mod', check: (sh) => sh.installed.has('cowsay') && sh.installed.has('fortune-mod'), done: 'Two packages, one command.' },
          { goal: 'Use a pipe <code>|</code> to send a fortune into the cow’s mouth!', hint: 'fortune | cowsay', check: (sh, last) => ran(last, 'fortune') && ran(last, 'cowsay'), done: 'The pipe sends one command’s output into the next. That’s real Linux wizardry!' },
          { goal: 'Install fastfetch and run it to show off your system.', hint: 'sudo dnf install fastfetch   then   fastfetch', check: (sh, last) => ran(last, 'fastfetch'), done: '🏆 LEGENDARY!' },
        ] },
        { type: 'card', emoji: '🎓', title: 'You did it!', text: 'You are now a <b>Linux Legend</b>! Keep exploring: try the <b>Free Play</b> terminal, print the <b>Cheat Sheet</b> for the fridge, and most of all — go use your real Fedora computer. Have fun! 🐧💙' },
      ],
      quests: [
        'Run fastfetch on the real computer (sudo dnf install fastfetch first).',
        'Teach someone in your family one terminal command.',
        'Print the LilNux cheat sheet and stick it near the computer.',
      ],
    },
  ];

  window.LILNUX_CHEATS = [
    { title: '🖥️ Desktop shortcuts', rows: [
      ['Super', 'Activities overview (then type to search)'], ['Super + A', 'Show all apps'], ['Alt + Tab', 'Switch apps'],
      ['Super + ← / →', 'Snap window left / right'], ['Super + ↑', 'Maximize window'], ['Super + H', 'Hide window'],
      ['Super + Page Up / Down', 'Change workspace'], ['Super + L', 'Lock screen'], ['Print Screen', 'Screenshot'], ['Super + V', 'Notifications & calendar'],
    ] },
    { title: '📁 Files app', rows: [
      ['Ctrl + H', 'Show / hide hidden files'], ['Ctrl + L', 'Type a location'], ['Ctrl + D', 'Bookmark this folder'],
      ['Ctrl + Shift + N', 'New folder'], ['Delete', 'Move to Trash'], ['Shift + Delete', 'Delete forever!'], ['F2', 'Rename'],
    ] },
    { title: '⌨️ Terminal basics', rows: [
      ['pwd', 'Where am I?'], ['ls   ·   ls -a   ·   ls -l', 'List files (hidden / details)'], ['cd Folder   ·   cd ..   ·   cd', 'Go in / up / home'],
      ['cat file', 'Show a file'], ['mkdir name', 'Make a folder'], ['touch name', 'Make an empty file'], ['echo "text" > file', 'Write text to a file'],
      ['cp from to', 'Copy'], ['mv from to', 'Move or rename'], ['rm file   ·   rm -r folder', 'Delete (no Trash!)'],
      ['grep word file', 'Find lines with a word'], ['chmod +x file', 'Make runnable'], ['man command', 'Manual (q quits)'], ['clear', 'Clean screen'],
    ] },
    { title: '⚡ Terminal keys', rows: [
      ['Tab', 'Finish names for you'], ['↑ / ↓', 'Previous commands'], ['Ctrl + C', 'Stop a command'], ['Ctrl + L', 'Clear screen'],
      ['Ctrl + Shift + C / V', 'Copy / paste'], ['cmd1 | cmd2', 'Pipe output into another command'], ['cmd1 && cmd2', 'Run cmd2 if cmd1 worked'],
    ] },
    { title: '📦 Software', rows: [
      ['Software app', 'Easiest way to install & update'], ['sudo dnf upgrade --refresh', 'Update everything'], ['dnf search word', 'Find packages'],
      ['sudo dnf install name', 'Install a package'], ['sudo dnf remove name', 'Remove a package'], ['flatpak install flathub app.id', 'Install from Flathub'],
      ['flatpak update', 'Update Flatpak apps'], ['flatpak list', 'List Flatpak apps'],
    ] },
    { title: '🔎 About my computer', rows: [
      ['cat /etc/fedora-release', 'Fedora version'], ['uname -r', 'Linux kernel version'], ['whoami', 'My user name'],
      ['df -h', 'Disk space'], ['free -h', 'Memory'], ['fastfetch', 'Show-off summary (install first)'], ['Settings → System → About', 'Same info, with clicks'],
    ] },
  ];
})();
