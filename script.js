let isEventNameExpanded = false; // Global flag for the checkbox list expansion

document.addEventListener("DOMContentLoaded", () => {
    fetchEvents(); // Load events from JSON on page load

    // Attach event listeners after DOM is fully loaded
    document.getElementById("searchBtn").addEventListener("click", () => performSearch(true));
    document.getElementById("applyFilters").addEventListener("click", () => performSearch(true));
    document.getElementById("resetFilters").addEventListener("click", resetFilters);

    // Add Enter key functionality for the search box
    document.getElementById("searchBox").addEventListener("keyup", function (e) {
        if (e.key === "Enter") {
            performSearch(true);
        }
    });
});

let currentPage = 1;
const itemsPerPage = 5;
let allResults = [];

// Fetch events from JSON file
async function fetchEvents() {
    try {
        const response = await fetch("events.json"); // Fetch data
        allResults = await response.json(); // Store data
        populateEventNameCheckboxes(allResults); // Populate event name checkboxes dynamically
        displayResults(allResults); // Show all events initially
    } catch (error) {
        console.error("Error fetching events:", error);
        document.getElementById("resultsContainer").innerHTML = "<p>Failed to load events.</p>";
    }
}

// Populate Event Name Checkboxes with "Show more"/"Show less" functionality
function populateEventNameCheckboxes(events) {
    const container = document.getElementById("eventNameCheckboxes");
    container.innerHTML = ""; // Clear previous content

    // Get unique event names, trimming spaces, and sort alphabetically
    let eventNames = [...new Set(events.map(event => event.event.trim()))].sort();

    // Determine how many items to show based on expansion state
    let itemsToShow = eventNames;
    if (!isEventNameExpanded && eventNames.length > 6) {
        itemsToShow = eventNames.slice(0, 6);
    }

    // Create a checkbox for each event name (using recommended markup)
    itemsToShow.forEach(name => {
        const checkboxId = `checkbox-${name.replace(/\s+/g, '-').toLowerCase()}`;
        const groupDiv = document.createElement("div");
        groupDiv.classList.add("nsw-form__group");

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = checkboxId;
        input.value = name;
        input.classList.add("nsw-form__checkbox-input");

        const label = document.createElement("label");
        label.classList.add("nsw-form__checkbox-label");
        label.setAttribute("for", checkboxId);
        label.textContent = name;

        groupDiv.appendChild(input);
        groupDiv.appendChild(label);
        container.appendChild(groupDiv);
    });

    // If there are more than 6 event names, add a toggle button
    if (eventNames.length > 6) {
        const toggleButton = document.createElement("button");
        toggleButton.classList.add("show-more-btn", "nsw-button");
        toggleButton.textContent = isEventNameExpanded ? "Show less" : "Show more";
        toggleButton.addEventListener("click", function () {
            isEventNameExpanded = !isEventNameExpanded;
            populateEventNameCheckboxes(events); // Re-populate with new state
        });
        container.appendChild(toggleButton);
    }
}

// Get selected event names from the checkboxes
function getSelectedEventNames() {
    return Array.from(document.querySelectorAll("#eventNameCheckboxes input[type='checkbox']:checked"))
        .map(cb => cb.value);
}

// Compare two dates by their local year, month, and day
function datesAreEqual(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Parse a "pretty" date like "Monday, 1 October 2016" to a Date object
function parseEventDate(dateStr) {
    const cleaned = dateStr.replace(/^[A-Za-z]+,?\s*/, '');
    return new Date(cleaned);
}

// Updated performSearch accepts a parameter "resetPage"
// If resetPage is true, currentPage is set to 1
function performSearch(resetPage = false) {
    if (resetPage) {
        currentPage = 1;
    }
    const searchQuery = document.getElementById("searchBox").value.toLowerCase().trim();
    const eventDate = document.getElementById("eventDate").value.trim();
    const selectedEventNames = getSelectedEventNames();

    const inputDt = eventDate ? new Date(eventDate) : null;

    let filteredResults = allResults.filter(event => {
        // Build a combined string of all key fields for keyword search
        const combinedText = [
            event.event,
            event.organisation,
            event.type,
            event.date,
            event.location,
            event.district,
            event.description
        ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

        const matchesSearch = !searchQuery || combinedText.includes(searchQuery);
        const matchesEventName =
            selectedEventNames.length === 0 || selectedEventNames.includes(event.event.trim());

        const eventDt = parseEventDate(event.date);
        let matchesDate = true;
        if (inputDt) {
            if (isNaN(eventDt.getTime())) {
                matchesDate = false;
            } else {
                matchesDate = datesAreEqual(eventDt, inputDt);
            }
        }
        return matchesSearch && matchesDate && matchesEventName;
    });

    displayResults(filteredResults);
}

// Display results with pagination and update results count
function displayResults(results) {
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = "";

    // Update results count display
    const resultsCountElement = document.getElementById("resultsCount");

    if (results.length === 0) {
        resultsContainer.innerHTML = "<p>No results found</p>";
        resultsCountElement.textContent = "Showing results 0 - 0 of 0 results";
        updatePagination(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, results.length);
    resultsCountElement.textContent = `Showing results ${startIndex + 1} - ${endIndex} of ${results.length} results`;

    const paginatedResults = results.slice(startIndex, startIndex + itemsPerPage);

    paginatedResults.forEach(event => {
        const div = document.createElement("div");
        div.classList.add("result-item");
        div.innerHTML = `
            <h3>${event.event}</h3>
            <p><strong>Organisation:</strong> ${event.organisation}</p>
            <p><strong>Type:</strong> ${event.type}</p>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>District:</strong> ${event.district}</p>
            <p>${event.description || ""}</p>
        `;
        resultsContainer.appendChild(div);
    });

    updatePagination(results.length);
}

// New updatePagination function following NSW Design System pattern
function updatePagination(totalResults) {
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const paginationContainer = document.getElementById("paginationContainer");
    paginationContainer.innerHTML = ""; // Clear previous pagination

    const ul = document.createElement("ul");

    // Previous button
    const prevLi = document.createElement("li");
    const prevLink = document.createElement("a");
    prevLink.classList.add("nsw-icon-button");
    prevLink.href = "#";
    if (currentPage === 1 || totalPages === 0) {
        prevLink.classList.add("disabled");
        prevLink.setAttribute("aria-disabled", "true");
    } else {
        prevLink.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage--;
            performSearch();
        });
    }
    prevLink.innerHTML = `
        <span class="material-icons nsw-material-icons" focusable="false" aria-hidden="true">keyboard_arrow_left</span>
        <span class="sr-only">Previous</span>`;
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);

    // Page number buttons
    if (totalPages <= 10) {
        // Show all page numbers if totalPages <= 10
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = "#";
            a.innerHTML = `<span class="sr-only">Page </span>${i}`;
            if (i === currentPage) {
                a.classList.add("active");
            }
            a.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = i;
                performSearch();
            });
            li.appendChild(a);
            ul.appendChild(li);
        }
    } else {
        // If there are more than 10 pages, show first 8, ellipsis, then last page.
        for (let i = 1; i <= 8; i++) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = "#";
            a.innerHTML = `<span class="sr-only">Page </span>${i}`;
            if (i === currentPage) {
                a.classList.add("active");
            }
            a.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = i;
                performSearch();
            });
            li.appendChild(a);
            ul.appendChild(li);
        }
        // Ellipsis
        const ellipsisLi = document.createElement("li");
        ellipsisLi.innerHTML = "<span>…</span>";
        ul.appendChild(ellipsisLi);
        // Last page
        const lastLi = document.createElement("li");
        const lastLink = document.createElement("a");
        lastLink.href = "#";
        lastLink.innerHTML = `<span class="sr-only">Page </span>${totalPages}`;
        if (currentPage === totalPages) {
            lastLink.classList.add("active");
        }
        lastLink.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = totalPages;
            performSearch();
        });
        lastLi.appendChild(lastLink);
        ul.appendChild(lastLi);
    }

    // Next button
    const nextLi = document.createElement("li");
    const nextLink = document.createElement("a");
    nextLink.classList.add("nsw-icon-button");
    nextLink.href = "#";
    if (currentPage === totalPages || totalPages === 0) {
        nextLink.classList.add("disabled");
        nextLink.setAttribute("aria-disabled", "true");
    } else {
        nextLink.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage++;
            performSearch();
        });
    }
    nextLink.innerHTML = `
        <span class="material-icons nsw-material-icons" focusable="false" aria-hidden="true">keyboard_arrow_right</span>
        <span class="sr-only">Next</span>`;
    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);

    paginationContainer.appendChild(ul);
}

// Reset Filters functionality
function resetFilters() {
    // Clear the search box and date filter
    document.getElementById("searchBox").value = "";
    document.getElementById("eventDate").value = "";
    
    // Uncheck all event name checkboxes
    const checkboxes = document.querySelectorAll("#eventNameCheckboxes input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = false);
    
    // Optionally, collapse the event name checkboxes if expanded
    isEventNameExpanded = false;
    populateEventNameCheckboxes(allResults);
    
    // Reset the current page and perform search to show all events
    currentPage = 1;
    performSearch(true);
}
