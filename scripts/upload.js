// upload.js handles the functionality of the note upload page.
// It populates dropdown menus for department, course, and tags by fetching data from the API.
// It also manages the form submission for uploading a new note, including its associated file.

// Ensures that the script runs only after the entire HTML document has been fully loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    // Retrieves DOM elements for department, course, and tag dropdowns, and the upload form.
    const departmentDropdown = document.getElementById('department_id');
    const courseDropdown = document.getElementById('course_id');
    const tagDropdown = document.getElementById('tag_id');
    const uploadForm = document.getElementById('upload-note-form');
  
    // Checks if all required DOM elements are present on the page.
    if (!departmentDropdown || !courseDropdown || !tagDropdown || !uploadForm) {
      console.error('Required DOM elements not found'); // Logs an error if any element is missing.
      return; // Exits the script if essential elements are not found to prevent further errors.
    }
  
    // Asynchronously fetches departments from the API and populates the department dropdown.
    const fetchDepartments = async () => {
      try {
        // Sends a GET request to the /departments API endpoint.
        const res = await fetch(`${API_BASE_URL}/departments`);
        // Parses the JSON response from the server.
        const departments = await res.json();
        // Iterates over each department object received.
        departments.forEach(dep => {
          const option = document.createElement('option'); // Creates a new <option> HTML element.
          option.value = dep.department_id; // Sets the value attribute of the option.
          option.textContent = dep.name; // Sets the visible text of the option.
          departmentDropdown.appendChild(option); // Adds the new option to the department dropdown.
        });
      } catch (err) { // Catches any errors that occur during the fetch operation or JSON parsing.
        console.error('Error fetching departments:', err); // Logs the error to the console.
      }
    };
  
    // Asynchronously fetches courses for a selected department and populates the course dropdown.
    const fetchCourses = async (departmentId) => {
      // Clears existing options in the course dropdown and adds a default placeholder option.
      courseDropdown.innerHTML = '<option value="">Select Course</option>';
      // If no departmentId is provided (e.g., "Select Department" is chosen), do not fetch courses.
      if (!departmentId) return;
  
      try {
        // Sends a GET request to the /courses API endpoint, filtering by department_id.
        const res = await fetch(`${API_BASE_URL}/courses?department_id=${departmentId}`);
        // Parses the JSON response.
        const courses = await res.json();
        // Iterates over each course object received.
        courses.forEach(course => {
          const option = document.createElement('option'); // Creates a new <option> element.
          option.value = course.course_id; // Sets the option's value.
          option.textContent = course.name; // Sets the option's display text.
          courseDropdown.appendChild(option); // Adds the new option to the course dropdown.
        });
      } catch (err) { // Catches errors during the fetch or parsing process.
        console.error('Error fetching courses:', err); // Logs the error.
      }
    };
  
    // Asynchronously fetches tags from the API and populates the tag dropdown.
    const fetchTags = async () => {
      try {
        // Sends a GET request to the /tags API endpoint.
        const res = await fetch(`${API_BASE_URL}/tags`);
        // Parses the JSON response.
        const tags = await res.json();
        // Iterates over each tag object received.
        tags.forEach(tag => {
          const option = document.createElement('option'); // Creates a new <option> element.
          option.value = tag.tag_id; // Sets the option's value.
          option.textContent = tag.name; // Sets the option's display text.
          tagDropdown.appendChild(option); // Adds the new option to the tag dropdown.
        });
      } catch (err) { // Catches errors during the fetch or parsing process.
        console.error('Error fetching tags:', err); // Logs the error.
      }
    };
  
    // Adds an event listener to the department dropdown to detect changes in selection.
    departmentDropdown.addEventListener('change', (e) => {
      // Retrieves the value of the selected department.
      const selectedDepartment = e.target.value;
      // Fetches and populates courses based on the newly selected department.
      fetchCourses(selectedDepartment);
    });
  
    // Adds an event listener to the upload form to handle submission.
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevents the default form submission behavior (which would cause a page reload).
      // Creates a FormData object from the upload form, which correctly handles file uploads.
      const formData = new FormData(uploadForm);
  
      try {
        // Sends a POST request to the /upload API endpoint with the form data.
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST', // Specifies the HTTP method.
          body: formData // Sets the request body to the FormData object.
        });
  
        // Checks if the server response indicates success (e.g., HTTP status 200-299).
        if (response.ok) {
          alert('Note uploaded successfully!'); // Notifies the user of successful upload.
          uploadForm.reset(); // Resets the form fields.
          // Resets the course dropdown to its default placeholder state.
          courseDropdown.innerHTML = '<option value="">Select Course</option>';
        } else { // If the server response indicates an error.
          // Attempts to read the error message from the response body as text.
          const error = await response.text();
          alert('Upload failed: ' + error); // Notifies the user of the failure with the server's error message.
        }
      } catch (err) { // Catches network errors or other issues during the upload process.
        alert('An error occurred during upload.'); // Notifies the user of a generic error.
        console.error(err); // Logs the detailed error to the console.
      }
    });
  
    // Initial calls to populate the department and tag dropdowns when the page loads.
    fetchDepartments();
    fetchTags();
  });
