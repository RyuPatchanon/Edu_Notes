// This script is responsible for managing the developer dashboard functionalities.

// This event listener ensures that the DOM is fully loaded and parsed before executing the functions to populate the dashboard.
document.addEventListener('DOMContentLoaded', () => {
  loadStats();          // Loads and displays general statistics.
  loadDeletedNotes();   // Loads and displays a list of deleted notes.
  loadDeletedReviews(); // Loads and displays a list of deleted reviews.
  loadDepartmentsForCourseForm(); // Populates the department dropdown in the "Add Course" form.
});

// Fetches and displays various statistics like total notes, files, and counts per course/department.
function loadStats() {
  fetch(`${API_BASE_URL}/stats`) // Asynchronously fetches data from the /stats endpoint.
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); // Basic error check for the fetch response.
      return res.json(); // Parses the JSON response.
    })
    .then(data => {
      const container = document.getElementById('stats'); // Gets the container element for statistics.
      if (!container) { // Guard clause if the container element is not found.
        console.error('Error: Stats container not found.');
        return;
      }
      // Uses a template literal to construct the HTML for displaying statistics.
      // Consider creating DOM elements programmatically for complex structures or if data needs sanitization,
      // though for trusted API data and simple display, innerHTML is often acceptable.
      container.innerHTML = `
        <p><strong>Total Notes:</strong> ${data.total_notes}</p>
        <p><strong>Total Files:</strong> ${data.total_files}</p>
        <p><strong>Files per Course:</strong></p>
        <ul>
          ${data.files_per_course.map(item => `<li>${item.course_name}: ${item.file_count}</li>`).join('')}
        </ul>
        <p><strong>Files per Department:</strong></p>
        <ul>
          ${data.files_per_department.map(item => `<li>${item.department_name}: ${item.file_count}</li>`).join('')}
        </ul>
      `;
    })
    .catch(error => { // Catches any errors from the fetch operation or JSON parsing.
      console.error('Error loading stats:', error);
      const container = document.getElementById('stats');
      if (container) container.innerHTML = '<p>Error loading statistics. Please try again later.</p>';
    });
}

// Fetches and displays a list of notes that have been marked as deleted, with an option to restore them.
function loadDeletedNotes() {
  fetch(`${API_BASE_URL}/deleted-notes`) // Asynchronously fetches data for deleted notes.
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(notes => {
      const container = document.getElementById('deleted-notes'); // Gets the container for deleted notes.
      if (!container) {
        console.error('Error: Deleted notes container not found.');
        return;
      }
      if (notes.length === 0) { // Checks if there are any deleted notes.
        container.innerHTML = '<p>No deleted notes.</p>'; // Displays a message if no notes are found.
        return;
      }

      // Maps over the array of deleted notes to create HTML for each one.
      // The onclick attribute directly calls a global function. For more complex applications,
      // consider adding event listeners programmatically after creating the elements.
      container.innerHTML = notes.map(note => `
        <div class="note-card">
          <h3>${note.title}</h3>
          <p>Deleted at: ${new Date(note.deleted_at).toLocaleString()}</p>
          <button onclick="restoreNote(${note.note_id})">Restore</button>
        </div>
      `).join(''); // Joins the array of HTML strings into a single string.
    })
    .catch(error => {
      console.error('Error loading deleted notes:', error);
      const container = document.getElementById('deleted-notes');
      if (container) container.innerHTML = '<p>Error loading deleted notes. Please try again later.</p>';
    });
}

// Fetches and displays a list of reviews that have been marked as deleted, with an option to restore them.
function loadDeletedReviews() {
  fetch(`${API_BASE_URL}/deleted-reviews`) // Asynchronously fetches data for deleted reviews.
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(reviews => {
      const container = document.getElementById('deleted-reviews'); // Gets the container for deleted reviews.
      if (!container) {
        console.error('Error: Deleted reviews container not found.');
        return;
      }
      if (reviews.length === 0) { // Checks if there are any deleted reviews.
        container.innerHTML = '<p>No deleted reviews.</p>'; // Displays a message if no reviews are found.
        return;
      }

      // Maps over the array of deleted reviews to create HTML for each one.
      container.innerHTML = reviews.map(review => `
        <div class="note-card">
          <p><strong>Note:</strong> ${review.note_title}</p>
          <p><strong>Rating:</strong> ${review.rating}</p>
          <p>${review.content}</p>
          <p><em>Deleted at:</em> ${new Date(review.deleted_at).toLocaleString()}</p>
          <button onclick="restoreReview(${review.review_id})">Restore</button>
        </div>
      `).join('');
    })
    .catch(error => {
      console.error('Error loading deleted reviews:', error);
      const container = document.getElementById('deleted-reviews');
      if (container) container.innerHTML = '<p>Error loading deleted reviews. Please try again later.</p>';
    });
}

// Sends a POST request to the API to restore a previously deleted note.
function restoreNote(noteId) {
  fetch(`${API_BASE_URL}/restore-note/${noteId}`, { method: 'POST' }) // Sends a POST request to the restore endpoint.
    .then(res => {
      if (res.ok) { // Checks if the request was successful.
        alert('Note restored'); // Notifies the user.
        loadDeletedNotes();     // Reloads the list of deleted notes to reflect the change.
      } else {
        alert('Failed to restore note.'); // Notifies the user of failure.
        // Consider logging the error or displaying more specific feedback from the server if available.
        res.json().then(err => console.error('Restore note error:', err)).catch(() => {});
      }
    })
    .catch(error => {
      console.error('Error restoring note:', error);
      alert('An error occurred while trying to restore the note.');
    });
}

// Sends a POST request to the API to restore a previously deleted review.
function restoreReview(reviewId) {
  fetch(`${API_BASE_URL}/restore-review/${reviewId}`, { method: 'POST' }) // Sends a POST request.
    .then(res => {
      if (res.ok) {
        alert('Review restored');
        loadDeletedReviews();   // Reloads the list of deleted reviews.
      } else {
        alert('Failed to restore review.');
        res.json().then(err => console.error('Restore review error:', err)).catch(() => {});
      }
    })
    .catch(error => {
      console.error('Error restoring review:', error);
      alert('An error occurred while trying to restore the review.');
    });
}

// Fetches departments from the API and populates the department selection dropdown in the "Add New Course" form.
function loadDepartmentsForCourseForm() {
  fetch(`${API_BASE_URL}/departments`) // Fetches the list of departments.
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(departments => {
      const select = document.getElementById('department-select'); // Gets the select element.
      if (!select) {
        console.error('Error: Department select dropdown not found for course form.');
        return;
      }
      // Clears existing options except for the placeholder
      while (select.options.length > 1) {
        select.remove(1);
      }
      departments.forEach(dep => { // Iterates over each department.
        const option = document.createElement('option'); // Creates a new <option> element.
        option.value = dep.department_id;                // Sets its value.
        option.textContent = dep.name;                   // Sets its display text.
        select.appendChild(option);                      // Adds it to the dropdown.
      });
    })
    .catch(err => { // Catches and logs any errors during the process.
      console.error('Error loading departments for course form:', err);
      const select = document.getElementById('department-select');
      if (select) {
        // Optionally, disable the form or show an error message in the UI
        select.innerHTML = '<option value="">Error loading departments</option>';
        select.disabled = true;
      }
    });
}

// Adds an event listener to the "Add New Course" form for handling submissions.
document.getElementById('course-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevents the default form submission behavior (page reload).

  // Retrieves and trims values from the form fields.
  const course_id = document.getElementById('course-id').value.trim();
  const name = document.getElementById('new-course').value.trim();
  const department_id = document.getElementById('department-select').value;

  // Basic validation to ensure all fields are filled.
  if (!course_id || !name || !department_id) {
    alert('Please fill out all fields for the new course.');
    return;
  }

  try {
    // Asynchronously sends a POST request to add the new course.
    const res = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Specifies the content type of the request body.
      body: JSON.stringify({ course_id, name, department_id }) // Converts the course data to a JSON string.
    });

    if (res.ok) { // If the request was successful.
      alert('Course added successfully');
      document.getElementById('course-form').reset(); // Resets the form fields.
      // Potentially reload or update parts of the page if the new course should be immediately visible elsewhere.
    } else {
      // Attempts to parse error message from server if available
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.message || `Failed to add course (status: ${res.status}, maybe ID already exists?)`;
      alert(errorMessage);
    }
  } catch (err) { // Catches network errors or issues with the fetch operation itself.
    console.error('Error adding course:', err);
    alert('An error occurred while adding the course.');
  }
});

// Adds an event listener to the "Add New Tag" form for handling submissions.
document.getElementById('tag-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevents default form submission.

  const name = document.getElementById('new-tag').value.trim(); // Gets and trims the tag name.
  if (!name) { // Basic validation for the tag name.
    alert('Please enter a tag name.');
    return;
  }

  try {
    // Asynchronously sends a POST request to add the new tag.
    const res = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }) // Converts the tag data to JSON.
    });

    if (res.ok) {
      alert('Tag added successfully');
      document.getElementById('tag-form').reset(); // Resets the form.
      // Consider reloading tags if they are displayed elsewhere on this page or if `app.js` needs to be aware of new tags immediately.
      // For example, if `app.js` also has a tag dropdown, it won't update automatically without a mechanism to do so.
    } else {
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.message || `Failed to add tag (status: ${res.status})`;
      alert(errorMessage);
    }
  } catch (err) {
    console.error('Error adding tag:', err);
    alert('An error occurred while adding the tag.');
  }
});

// Note: The call to loadDepartmentsForCourseForm() was moved to the DOMContentLoaded listener
// to ensure it runs after the DOM is ready and to group initialization logic.
