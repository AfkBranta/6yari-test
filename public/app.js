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

async function fetchAlbums(endpoint) {
    trackContainer.innerHTML = '<p>Loading...</p>';
    const res = await fetch(`/api/${endpoint}`);
    albumsData = await res.json();
    renderMainView(albumsData);
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
        <audio controls>
          <source src="${leak.audio}" type="audio/mpeg" />
          Your browser does not support audio.
        </audio>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading leaks:', err);
    container.innerHTML = '<p>Failed to load leaks.</p>';
  }
}


releasedBtn.onclick = () => fetchAlbums('bunii');
unreleasedBtn.onclick = () => fetchAlbums('shy');
allBtn.onclick = () => fetchAlbums('all');
document.getElementById('leaksBtn').onclick = loadLeaks;



fetchAlbums('bunii');
