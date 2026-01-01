const trackContainer = document.getElementById('tracks');
const releasedBtn = document.getElementById('releasedBtn');
const unreleasedBtn = document.getElementById('unreleasedBtn');
const allBtn = document.getElementById('allBtn');
const backBtn = document.getElementById('backBtn');

let albumsData = [];

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showBackButton(show = true) {
  backBtn.style.display = show ? 'inline-block' : 'none';
}

backBtn.onclick = () => {
  renderMainView(albumsData);
  showBackButton(false);
};

function sortByReleaseDateDesc(items) {
    return items.sort((a, b) => {
        const dateA = new Date(a.releaseDate || 0);
        const dateB = new Date(b.releaseDate || 0);
        return dateB - dateA; // newest first
    });
}

async function fetchAlbums(endpoint) {
    trackContainer.innerHTML = '<p>Loading...</p>';

    try {
        const res = await fetch(`/api/${endpoint}`);
        const data = await res.json();

        albumsData = sortByReleaseDateDesc(data);
        renderMainView(albumsData);
    } catch (err) {
        console.error(err);
        trackContainer.innerHTML = '<p>Failed to load data.</p>';
    }
}


function renderMainView(albums) {
    trackContainer.innerHTML = '';

    albums.forEach(album => {
        if (album.tracks.length === 1) {
            renderSingle(album);
        } else {
            renderAlbumCard(album);
        }
    });
}

function renderSingle(album) {
    const track = album.tracks[0];

    const div = document.createElement('div');
    div.className = 'track';
    div.innerHTML = `
        <img src="${album.artwork}">
        <h3>${track.name}</h3>
        <p class="sub">${formatDate(album.releaseDate)}</p>

        ${track.preview_url ? `<audio controls src="${track.preview_url}"></audio>` : ''}

        <div class="button-row">
            <a class="btn" href="${track.spotify_url}" target="_blank">Open on Spotify</a>
            <a class="btn" href="https://genius.com/search?q=${encodeURIComponent(`${track.name} ${track.artists}`)}" target="_blank">Lyrics</a>
            <a class="btn secondary" href="/api/download-cover?url=${encodeURIComponent(album.artwork)}"> Download Cover</a>
        </div>
    `;
    trackContainer.appendChild(div);
}

function renderAlbumCard(album) {
    const div = document.createElement('div');
    div.className = 'track album-card';

    div.innerHTML = 
    `
        <img src="${album.artwork}">
        <h3>${album.albumName}</h3>
        <p class="sub">
            ${album.tracks.length} tracks • ${formatDate(album.releaseDate)}
        </p>

        <div class="button-row">
            <a class="btn"
               href="https://open.spotify.com/album/${album.album_id}"
               target="_blank"
               onclick="event.stopPropagation()">
               Listen on Spotify
            </a>

            <a class="btn secondary"
               href="${album.artwork}"
               download
               onclick="event.stopPropagation()">
               Download Cover
            </a>
        </div>
    `;

    div.onclick = () => renderAlbumTracks(album);
    trackContainer.appendChild(div);
}
function renderAlbumTracks(album) {
const container = document.getElementById('tracks');
container.innerHTML = '';

showBackButton(true);

  album.tracks.forEach((track, i) => {
    const div = document.createElement('div');
    div.className = 'track';
    div.innerHTML = `
      <img src="${album.artwork}">
      <h3>${i + 1}. ${track.name}</h3>
      <p class="sub">${formatDate(album.releaseDate)}</p>
      ${track.preview_url ? `<audio controls src="${track.preview_url}"></audio>` : ''}
      <div class="button-row">
        <a class="btn" href="${track.spotify_url}" target="_blank">Open on Spotify</a>
        <a class="btn" href="https://genius.com/search?q=${encodeURIComponent(`${track.name} ${track.artists}`)}" target="_blank">Lyrics</a>
        <a class="btn secondary" href="/api/download-cover?url=${encodeURIComponent(album.artwork)}">Download Cover</a>
      </div>
    `;
    container.appendChild(div);
  });
}

let activeAudio = null;

function stopActiveAudio() {
  if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;

      document.querySelectorAll('.player-btn').forEach(b => b.textContent = '▶');
      document.querySelectorAll('.player-progress').forEach(p => p.style.width = '0%');
      document.querySelectorAll('.player-time').forEach(t => t.textContent = '0:00');

      activeAudio = null;
  }
}

function setupPlayers() {
    document.querySelectorAll('.player').forEach(player => {
        const audio = new Audio(player.dataset.audio);
        const btn = player.querySelector('.player-btn');
        const bar = player.querySelector('.player-bar');
        const progress = player.querySelector('.player-progress');
        const time = player.querySelector('.player-time');

        btn.onclick = () => {
            if (activeAudio && activeAudio !== audio) {
                activeAudio.pause();
                document.querySelectorAll('.player-btn').forEach(b => b.textContent = '▶');
            }

            if (audio.paused) {
                audio.play();
                btn.textContent = '⏸';
                activeAudio = audio;
            } else {
                audio.pause();
                btn.textContent = '▶';
            }
        };

        audio.ontimeupdate = () => {
            if (!audio.duration) return;
            progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
            time.textContent = formatTime(audio.currentTime);
        };

        audio.onended = () => {
            btn.textContent = '▶';
            progress.style.width = '0%';
            time.textContent = '0:00';
        };

        bar.onclick = e => {
            const rect = bar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        };
    });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function loadLeaks() {
  const container = document.getElementById('tracks');
  container.innerHTML = '<p>Loading leaks...</p>';

  try {
    const res = await fetch('/api/leaks');
    const leaks = await res.json();

    container.innerHTML = '';

    leaks.forEach(leak => {
      const div = document.createElement('div');
      div.className = 'track';
      div.innerHTML = `
        <img src="${leak.cover}" alt="${leak.title} cover" />
        <h3>${leak.title}</h3>
        <p class="sub">${leak.artist} • ${leak.releaseDate}</p>
        <div class="player" data-audio="${leak.audio}">
          <button class="player-btn">▶</button>
          <div class="player-bar">
            <div class="player-progress"></div>
          </div>
          <span class="player-time">0:00</span>
        </div>
      `;
      container.appendChild(div);
    });

    setupPlayers();

  } catch (err) {
    console.error('Error loading leaks:', err);
    container.innerHTML = '<p>Failed to load leaks.</p>';
  }
}

releasedBtn.onclick = () => fetchAlbums('bunii');
unreleasedBtn.onclick = () => fetchAlbums('shy');
allBtn.onclick = () => fetchAlbums('all');
document.getElementById('leaksBtn').onclick = loadLeaks;

releasedBtn.onclick = () => {
    stopActiveAudio();
    fetchAlbums('bunii');
};

unreleasedBtn.onclick = () => {
    stopActiveAudio();
    fetchAlbums('shy');
};

allBtn.onclick = () => {
    stopActiveAudio();
    fetchAlbums('all');
};

document.getElementById('leaksBtn').onclick = () => {
    stopActiveAudio();
    loadLeaks();
};

backBtn.onclick = () => {
    stopActiveAudio();
    renderMainView(albumsData);
    showBackButton(false);
};

fetchAlbums('bunii');