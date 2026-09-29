/* ================================================================
   SMARTCAMPUS — FRONT-END DEMO LOGIC
   ================================================================ */

const CAMPUS = {
  lat: 26.2325,
  lng: 78.2053,
  zoom: 16
};

const reports = [
  {
    id: 1,
    type: "lost",
    name: "Black leather wallet",
    category: "accessories",
    categoryLabel: "Accessories",
    location: "Central Library",
    locationKey: "library",
    time: "12 min ago",
    description: "Black wallet with a small silver logo. May contain student ID.",
    emoji: "👛",
    photoClass: "wallet",
    lat: 26.23305,
    lng: 78.20480
  },
  {
    id: 2,
    type: "found",
    name: "Digital wrist watch",
    category: "accessories",
    categoryLabel: "Accessories",
    location: "Academic Block",
    locationKey: "academic",
    time: "28 min ago",
    description: "Dark strap, rectangular display. Found near the entrance.",
    emoji: "⌚",
    photoClass: "watch",
    lat: 26.23245,
    lng: 78.20575
  },
  {
    id: 3,
    type: "lost",
    name: "Student ID card",
    category: "documents",
    categoryLabel: "Documents",
    location: "Main Building",
    locationKey: "academic",
    time: "46 min ago",
    description: "MITS student ID card in a transparent plastic holder.",
    emoji: "🪪",
    photoClass: "id-card",
    lat: 26.23210,
    lng: 78.20510
  },
  {
    id: 4,
    type: "found",
    name: "Wireless headphones",
    category: "electronics",
    categoryLabel: "Electronics",
    location: "Canteen",
    locationKey: "canteen",
    time: "1 hr ago",
    description: "White wireless earbuds in a compact charging case.",
    emoji: "🎧",
    photoClass: "headphones",
    lat: 26.23180,
    lng: 78.20435
  },
  {
    id: 5,
    type: "lost",
    name: "Key ring with blue tag",
    category: "keys",
    categoryLabel: "Keys",
    location: "Hostel Area",
    locationKey: "hostel",
    time: "2 hrs ago",
    description: "Three keys attached to a blue plastic tag.",
    emoji: "🔑",
    photoClass: "keys",
    lat: 26.23325,
    lng: 78.20705
  },
  {
    id: 6,
    type: "found",
    name: "Steel water bottle",
    category: "accessories",
    categoryLabel: "Accessories",
    location: "Sports Ground",
    locationKey: "hostel",
    time: "3 hrs ago",
    description: "Matte steel bottle with a small black sticker.",
    emoji: "🧴",
    photoClass: "bottle",
    lat: 26.23145,
    lng: 78.20635
  }
];

let visibleReports = [...reports];
let map;
let mapMarkers = [];
let activeMapFilter = "all";
let reportMode = "lost";
let toastTimer;

/* ================================================================
   DOM HELPERS
   ================================================================ */

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================================================================
   ITEM CARDS
   ================================================================ */

function itemCardTemplate(item) {
  const typeLabel = item.type === "lost" ? "Lost" : "Found";
  const actionLabel = item.type === "lost"
    ? "View possible matches"
    : "Check if this is mine";

  return `
    <article class="item-card" data-id="${item.id}">
      <div class="item-photo ${item.photoClass}">
        <span class="item-status ${item.type}">
          <span>●</span>
          ${typeLabel}
        </span>
        <span class="item-emoji" aria-hidden="true">${item.emoji}</span>
      </div>

      <div class="item-body">
        <div class="item-topline">
          <span class="item-category">${escapeHTML(item.categoryLabel)}</span>
          <span class="item-time">${escapeHTML(item.time)}</span>
        </div>

        <h3>${escapeHTML(item.name)}</h3>

        <p class="item-description">
          ${escapeHTML(item.description)}
        </p>

        <div class="item-meta">
          <span class="location-dot">●</span>
          <span>${escapeHTML(item.location)}</span>
        </div>

        <button
          class="item-action"
          type="button"
          data-item-action="${item.id}"
        >
          ${actionLabel} →
        </button>
      </div>
    </article>
  `;
}

function renderItems(items = visibleReports) {
  const grid = $("#itemsGrid");
  const empty = $("#emptyState");
  const count = $("#resultsCount");

  count.textContent = items.length;

  if (!items.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = items.map(itemCardTemplate).join("");
}

/* ================================================================
   FILTERING / SEARCH
   ================================================================ */

function getFilters() {
  return {
    search: $("#searchInput").value.trim().toLowerCase(),
    status: $("#statusFilter").value,
    category: $("#categoryFilter").value,
    location: $("#locationFilter").value
  };
}

function applyFilters() {
  const filters = getFilters();

  visibleReports = reports.filter((item) => {
    const searchable = [
      item.name,
      item.description,
      item.location,
      item.categoryLabel
    ].join(" ").toLowerCase();

    const searchMatches =
      !filters.search ||
      searchable.includes(filters.search);

    const statusMatches =
      filters.status === "all" ||
      item.type === filters.status;

    const categoryMatches =
      filters.category === "all" ||
      item.category === filters.category;

    const locationMatches =
      filters.location === "all" ||
      item.locationKey === filters.location;

    return (
      searchMatches &&
      statusMatches &&
      categoryMatches &&
      locationMatches
    );
  });

  renderItems(visibleReports);
}

function clearFilters() {
  $("#searchInput").value = "";
  $("#statusFilter").value = "all";
  $("#categoryFilter").value = "all";
  $("#locationFilter").value = "all";
  applyFilters();

  showToast(
    "Filters cleared",
    "Showing all active reports again."
  );
}

/* ================================================================
   MAP
   ================================================================ */

function createMarkerIcon(type) {
  const background = type === "lost"
    ? "#f3a93b"
    : "#087a67";

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div
        style="
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border:3px solid white;
          border-radius:50% 50% 50% 4px;
          background:${background};
          box-shadow:0 5px 13px rgba(0,0,0,.22);
          transform:rotate(-45deg);
        "
      >
        <span
          style="
            color:white;
            font-size:10px;
            font-weight:900;
            transform:rotate(45deg);
          "
        >
          ${type === "lost" ? "!" : "✓"}
        </span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  });
}

function initializeMap() {
  if (!window.L || !$("#campusMap")) {
    return;
  }

  map = L.map("campusMap", {
    zoomControl: true,
    scrollWheelZoom: true,
    minZoom: 1,
    maxZoom: 19,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1
  }).setView([CAMPUS.lat, CAMPUS.lng], CAMPUS.zoom);

  // OpenFreeMap provides OpenStreetMap-based vector tiles without requiring
  // an API key. This avoids the 403 that can occur when opening this project
  // directly from a local file (file://), where the OSM tile server cannot
  // receive the required HTTP Referer header.
  if (typeof L.maplibreGL === "function" && window.maplibregl) {
    L.maplibreGL({
      style: "https://tiles.openfreemap.org/styles/liberty"
    }).addTo(map);
  } else {
    // Keep the map usable if the optional MapLibre CDN fails to load.
    const fallback = $("#campusMap");
    fallback.insertAdjacentHTML(
      "beforeend",
      `<div class="map-load-message">
        <strong>Map could not load</strong>
        <span>Check your internet connection and refresh the page.</span>
      </div>`
    );
  }

  const campusCircle = L.circle(
    [CAMPUS.lat, CAMPUS.lng],
    {
      radius: 430,
      color: "#087a67",
      weight: 1,
      fillColor: "#087a67",
      fillOpacity: .05
    }
  ).addTo(map);

  campusCircle.bindTooltip("MITS Gwalior campus area", {
    sticky: true
  });

  renderMapMarkers();
}

function renderMapMarkers() {
  if (!map) {
    return;
  }

  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = [];

  reports
    .filter((item) => {
      return activeMapFilter === "all" ||
        item.type === activeMapFilter;
    })
    .forEach((item) => {
      const marker = L.marker(
        [item.lat, item.lng],
        {
          icon: createMarkerIcon(item.type)
        }
      ).addTo(map);

      marker.bindPopup(`
        <div class="map-popup">
          <strong>${escapeHTML(item.name)}</strong>
          <span>${item.type === "lost" ? "Lost" : "Found"} · ${escapeHTML(item.location)}</span>
          <br>
          <span>${escapeHTML(item.time)}</span>
        </div>
      `);

      marker.on("click", () => {
        highlightNearbyItem(item.id);
      });

      mapMarkers.push(marker);
    });

  $("#mapReportCount").textContent = reports.filter((item) => {
    return activeMapFilter === "all" || item.type === activeMapFilter;
  }).length;
}

function setMapFilter(filter) {
  activeMapFilter = filter;

  $$(".map-control").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.mapFilter === filter
    );
  });

  renderMapMarkers();
  renderNearbyList();
}

function renderNearbyList() {
  const list = $("#nearbyList");

  const filtered = reports.filter((item) => {
    return activeMapFilter === "all" || item.type === activeMapFilter;
  });

  list.innerHTML = filtered.slice(0, 5).map((item) => `
    <button
      class="nearby-item"
      type="button"
      data-nearby-id="${item.id}"
    >
      <span class="nearby-thumb">${item.emoji}</span>
      <span>
        <strong>${escapeHTML(item.name)}</strong>
        <span>${escapeHTML(item.location)} · ${escapeHTML(item.time)}</span>
      </span>
      <span class="nearby-status ${item.type}">
        ${item.type}
      </span>
    </button>
  `).join("");
}

function highlightNearbyItem(id) {
  const item = reports.find((report) => report.id === Number(id));

  if (!item || !map) {
    return;
  }

  map.flyTo([item.lat, item.lng], 17, {
    duration: .7
  });

  setTimeout(() => {
    const matchingMarker = mapMarkers.find((marker) => {
      const position = marker.getLatLng();
      return (
        Math.abs(position.lat - item.lat) < .00001 &&
        Math.abs(position.lng - item.lng) < .00001
      );
    });

    if (matchingMarker) {
      matchingMarker.openPopup();
    }
  }, 650);
}

function searchMapLocation() {
  const query = $("#mapSearch").value.trim().toLowerCase();

  if (!query || !map) {
    return;
  }

  const item = reports.find((report) => {
    return [
      report.location,
      report.name,
      report.categoryLabel
    ].join(" ").toLowerCase().includes(query);
  });

  if (item) {
    highlightNearbyItem(item.id);
    return;
  }

  const locationNames = {
    library: "Central Library",
    academic: "Academic Block",
    canteen: "Canteen",
    hostel: "Hostel Area",
    "main-gate": "Main Gate"
  };

  const matchingLocation = Object.entries(locationNames)
    .find(([, name]) => name.toLowerCase().includes(query));

  if (matchingLocation) {
    const nearbyItem = reports.find(
      (report) => report.locationKey === matchingLocation[0]
    );

    if (nearbyItem) {
      highlightNearbyItem(nearbyItem.id);
      return;
    }
  }

  showToast(
    "Location not found",
    "Try Central Library, Academic Block or Canteen."
  );
}

function locateUser() {
  if (!navigator.geolocation) {
    showToast(
      "Location unavailable",
      "Your browser does not support geolocation."
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [
        position.coords.latitude,
        position.coords.longitude
      ];

      if (map) {
        map.flyTo(coords, 17, {
          duration: .8
        });

        L.circleMarker(coords, {
          radius: 7,
          color: "#087a67",
          fillColor: "#41d6ae",
          fillOpacity: 1,
          weight: 3
        })
          .addTo(map)
          .bindPopup("Your approximate location")
          .openPopup();
      }
    },
    () => {
      showToast(
        "Location permission needed",
        "Allow location access to center the map on you."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 8000
    }
  );
}

/* ================================================================
   REPORT MODAL
   ================================================================ */

const modal = $("#reportModal");

function openReportModal(mode = "lost") {
  reportMode = mode;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  setReportMode(mode);

  setTimeout(() => {
    $("#itemName").focus();
  }, 120);
}

function closeReportModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function setReportMode(mode) {
  reportMode = mode;

  $$(".mode-btn").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.reportMode === mode
    );
  });

  const title = $("#modalTitle");
  const subtitle = $("#modalSubtitle");
  const kicker = $("#modalKicker");

  if (mode === "found") {
    kicker.textContent = "FOUND ITEM";
    title.textContent = "Report a found item";
    subtitle.textContent =
      "Add enough detail for the owner to recognize their item.";
    return;
  }

  if (mode === "claim") {
    kicker.textContent = "CLAIM";
    title.textContent = "Check ownership";
    subtitle.textContent =
      "Tell us what makes this item yours before revealing sensitive details.";
    return;
  }

  kicker.textContent = "LOST ITEM";
  title.textContent = "Report a lost item";
  subtitle.textContent =
    "Give the community enough information to recognize your item.";
}

function resetReportForm() {
  $("#reportForm").reset();
  $("#photoPreview").hidden = true;
  $("#previewImg").removeAttribute("src");
  $("#itemDate").value = new Date().toISOString().slice(0, 10);
}

/* ================================================================
   PHOTO PREVIEW
   ================================================================ */

function handlePhotoPreview(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast(
      "Photo is too large",
      "Please choose an image smaller than 5 MB."
    );

    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = (loadEvent) => {
    $("#previewImg").src = loadEvent.target.result;
    $("#photoPreview").hidden = false;
  };

  reader.readAsDataURL(file);
}

/* ================================================================
   TOAST
   ================================================================ */

function showToast(title, message) {
  const toast = $("#toast");

  $("#toastTitle").textContent = title;
  $("#toastMessage").textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3600);
}

/* ================================================================
   THEME
   ================================================================ */

function initializeTheme() {
  const savedTheme = localStorage.getItem("smartcampus-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    $("#themeIcon").textContent = "☀";
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");

  localStorage.setItem(
    "smartcampus-theme",
    isDark ? "dark" : "light"
  );

  $("#themeIcon").textContent = isDark ? "☀" : "☾";
}

/* ================================================================
   NAVIGATION / SCROLLING
   ================================================================ */

function scrollToSelector(selector) {
  const element = $(selector);

  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function initializeNavigation() {
  const menuToggle = $("#menuToggle");
  const mobileNav = $("#mobileNav");

  menuToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });

  $$("#mobileNav a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  $$(".text-btn, [data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const selector = button.dataset.scroll;

      if (selector) {
        scrollToSelector(selector);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "SELECT"
    ) {
      event.preventDefault();
      $("#searchInput").focus();
    }

    if (event.key === "Escape" && modal.classList.contains("open")) {
      closeReportModal();
    }
  });
}

/* ================================================================
   REPORT FORM
   ================================================================ */

function submitReport(event) {
  event.preventDefault();

  const requiredFields = [
    $("#itemName"),
    $("#itemCategory"),
    $("#itemDate"),
    $("#itemLocation"),
    $("#itemDescription")
  ];

  const invalidField = requiredFields.find(
    (field) => !field.value.trim()
  );

  if (invalidField) {
    invalidField.focus();

    showToast(
      "A few details are missing",
      "Please complete all required fields."
    );

    return;
  }

  const itemName = $("#itemName").value.trim();

  closeReportModal();

  showToast(
    "Report submitted",
    `"${itemName}" was added to the demo report list.`
  );

  resetReportForm();
}

function initializeReportButtons() {
  $$("[data-open-report]").forEach((button) => {
    button.addEventListener("click", () => {
      openReportModal(button.dataset.openReport);
    });
  });

  $$(".mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setReportMode(button.dataset.reportMode);
    });
  });

  $("#modalClose").addEventListener("click", closeReportModal);
  $("#cancelReport").addEventListener("click", closeReportModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeReportModal();
    }
  });

  $("#reportForm").addEventListener("submit", submitReport);

  $("#itemPhoto").addEventListener(
    "change",
    handlePhotoPreview
  );

  $("#removePhoto").addEventListener("click", () => {
    $("#itemPhoto").value = "";
    $("#photoPreview").hidden = true;
    $("#previewImg").removeAttribute("src");
  });

  resetReportForm();
}

/* ================================================================
   ITEM ACTIONS
   ================================================================ */

function initializeItemActions() {
  $("#itemsGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-action]");

    if (!button) {
      return;
    }

    const item = reports.find(
      (report) => report.id === Number(button.dataset.itemAction)
    );

    if (!item) {
      return;
    }

    if (item.type === "lost") {
      showToast(
        "Potential matches",
        `Showing possible matches for ${item.name}.`
      );
    } else {
      openReportModal("claim");
      $("#itemName").value = item.name;
      $("#itemDescription").value =
        `I'm claiming the ${item.name}. My identifying detail is: `;
    }
  });

  $("#nearbyList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-nearby-id]");

    if (!button) {
      return;
    }

    highlightNearbyItem(button.dataset.nearbyId);
  });
}

/* ================================================================
   SORTING
   ================================================================ */

let newestFirst = true;

function initializeSort() {
  $("#sortButton").addEventListener("click", () => {
    newestFirst = !newestFirst;

    visibleReports = newestFirst
      ? [...visibleReports]
      : [...visibleReports].reverse();

    renderItems(visibleReports);

    $("#sortButton").childNodes[0].textContent =
      newestFirst ? "Recently reported " : "Oldest reports ";
  });
}

/* ================================================================
   STATS
   ================================================================ */

function initializeStats() {
  const lostCount = reports.filter((item) => item.type === "lost").length;
  const foundCount = reports.filter((item) => item.type === "found").length;

  $("[data-stat='lost']").textContent = 14 + lostCount - 3;
  $("[data-stat='found']").textContent = 10 + foundCount - 3;
  $("[data-stat='active']").textContent = reports.length + 18;
}

/* ================================================================
   INIT
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeNavigation();
  initializeReportButtons();
  initializeItemActions();
  initializeSort();
  initializeStats();

  renderItems();
  renderNearbyList();
  initializeMap();

  $("#themeToggle").addEventListener("click", toggleTheme);

  $("#searchInput").addEventListener("input", applyFilters);
  $("#statusFilter").addEventListener("change", applyFilters);
  $("#categoryFilter").addEventListener("change", applyFilters);
  $("#locationFilter").addEventListener("change", applyFilters);

  $("#clearFilters").addEventListener("click", clearFilters);
  $("#emptyClear").addEventListener("click", clearFilters);

  $$(".map-control").forEach((button) => {
    button.addEventListener("click", () => {
      setMapFilter(button.dataset.mapFilter);
    });
  });

  $("#mapSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchMapLocation();
    }
  });

  $("#locateMe").addEventListener("click", locateUser);

  $("#loadMore").addEventListener("click", () => {
    showToast(
      "Demo limit reached",
      "The backend can load additional reports here later."
    );
  });
});
