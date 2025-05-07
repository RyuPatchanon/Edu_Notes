// app.js is for the main functionality of the application.
// It handles fetching data from the API, populating dropdowns, and displaying notes based on user-selected filters.

// Fetches departments from the API and populates the department dropdown menu.
const fetchDepartments = async () => {
    // Asynchronously fetches data from the /departments endpoint.
    const response = await fetch(`${API_BASE_URL}/departments`);
    // Parses the JSON response from the server.
    const departments = await response.json();
    // Gets the department dropdown element from the DOM.
    const departmentDropdown = document.getElementById('department-dropdown');
    // Iterates over each department received from the API.
    departments.forEach(department => {
        const option = document.createElement('option'); // Creates a new <option> HTML element.
        option.value = department.department_id;         // Sets the value attribute of the option (e.g., for form submission).
        option.textContent = department.name;            // Sets the visible text of the option.
        departmentDropdown.appendChild(option);          // Adds the newly created option to the dropdown.
    });
};

// Fetches courses for a specific department and populates the course dropdown menu.
const fetchCourses = async (departmentId) => {
    // Asynchronously fetches courses, filtering by the provided departmentId.
    const response = await fetch(`${API_BASE_URL}/courses?department_id=${departmentId}`);
    // Parses the JSON response.
    const courses = await response.json();
    // Gets the course dropdown element from the DOM.
    const courseDropdown = document.getElementById('course-dropdown');
    courseDropdown.innerHTML = '<option value="">Select Course</option>'; // Clears existing options and adds a default placeholder.
    // Iterates over each course received.
    courses.forEach(course => {
        const option = document.createElement('option'); // Creates a new <option> element.
        option.value = course.course_id;                 // Sets the option's value.
        option.textContent = course.name;                // Sets the option's display text.
        courseDropdown.appendChild(option);              // Adds the new option to the course dropdown.
    });
};

// Fetches tags from the API and populates the tag dropdown menu.
const fetchTags = async () => {
    // Asynchronously fetches data from the /tags endpoint.
    const response = await fetch(`${API_BASE_URL}/tags`);
    // Parses the JSON response.
    const tags = await response.json();
    // Gets the tag dropdown element from the DOM.
    const tagDropdown = document.getElementById('tag-dropdown');
    // Iterates over each tag received.
    tags.forEach(tag => {
        const option = document.createElement('option'); // Creates a new <option> element.
        option.value = tag.tag_id;                       // Sets the option's value.
        option.textContent = tag.name;                  // Sets the option's display text.
        tagDropdown.appendChild(option);                // Adds the new option to the tag dropdown.
    });
};

// Fetches notes based on selected filters (department, course, tag, sort order) and displays them.
const fetchNotes = async () => {
    // Retrieves the selected values from the filter dropdowns.
    const departmentId = document.getElementById('department-dropdown').value;
    const courseId = document.getElementById('course-dropdown').value;
    const tagId = document.getElementById('tag-dropdown').value;
    const sortBy = document.getElementById('sort-dropdown').value;

    // Creates a URLSearchParams object to build the query string.
    const query = new URLSearchParams();
    // Appends parameters to the query string only if they have a value.
    if (departmentId) query.append('department_id', departmentId);
    if (courseId) query.append('course_id', courseId);
    if (tagId) query.append('tag_id', tagId);
    if (sortBy) query.append('sort_by', sortBy);

    // Asynchronously fetches notes from the /notes endpoint with the constructed query string.
    const response = await fetch(`${API_BASE_URL}/notes?${query.toString()}`);
    // Parses the JSON response.
    const notes = await response.json();
    // Gets the container element where notes will be displayed.
    const notesContainer = document.getElementById('notes-container');
    notesContainer.innerHTML = ''; // Clears any previously displayed notes.

    // Iterates over each note received.
    notes.forEach(note => {
        const noteCard = document.createElement('div'); // Creates a new <div> element for the note card.
        noteCard.classList.add('note-card');          // Adds a CSS class for styling.
        // Sets the inner HTML of the note card with note details and a "View Details" button.
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <p>Course: ${note.course_name}</p>
            <p>Tags: ${note.tags}</p>
            <p>Avg. Rating: ${note.avg_rating || 'N/A'}</p>
            <button onclick="viewNoteDetails(${note.note_id})">View Details</button> 
        `;
        notesContainer.appendChild(noteCard); // Appends the note card to the notes container.
    });
};

// Redirects the user to the note detail page for a specific note.
const viewNoteDetails = (noteId) => {
    // Changes the browser's URL to navigate to note-detail.html, passing the noteId as a query parameter.
    window.location.href = `note-detail.html?id=${noteId}`;
};

// Event listeners for filter changes
// When the department dropdown selection changes:
document.getElementById('department-dropdown').addEventListener('change', (e) => {
    fetchCourses(e.target.value); // Fetch courses for the newly selected department.
    fetchNotes();                 // Then, fetch notes based on the new set of filters.
});
// When the course dropdown selection changes, fetch notes.
document.getElementById('course-dropdown').addEventListener('change', fetchNotes);
// When the tag dropdown selection changes, fetch notes.
document.getElementById('tag-dropdown').addEventListener('change', fetchNotes);
// When the sort order dropdown selection changes, fetch notes.
document.getElementById('sort-dropdown').addEventListener('change', fetchNotes);

// Initialize data
// These functions are called when the script first loads to populate the page with initial data.
fetchDepartments();
fetchTags();
fetchNotes();