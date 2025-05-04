const fetchDepartments = async () => {
    const response = await fetch(`${API_BASE_URL}/departments`);
    const departments = await response.json();
    const departmentDropdown = document.getElementById('department-dropdown');
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.department_id;
        option.textContent = department.name;
        departmentDropdown.appendChild(option);
    });
};

const fetchCourses = async (departmentId) => {
    const response = await fetch(`${API_BASE_URL}/courses?department_id=${departmentId}`);
    const courses = await response.json();
    const courseDropdown = document.getElementById('course-dropdown');
    courseDropdown.innerHTML = '<option value="">Select Course</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.course_id;
        option.textContent = course.name;
        courseDropdown.appendChild(option);
    });
};

const fetchTags = async () => {
    const response = await fetch(`${API_BASE_URL}/tags`);
    const tags = await response.json();
    const tagDropdown = document.getElementById('tag-dropdown');
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.tag_id;
        option.textContent = tag.name;
        tagDropdown.appendChild(option);
    });
};

const fetchNotes = async () => {
    const departmentId = document.getElementById('department-dropdown').value;
    const courseId = document.getElementById('course-dropdown').value;
    const tagId = document.getElementById('tag-dropdown').value;
    const sortBy = document.getElementById('sort-dropdown').value;

    const query = new URLSearchParams();
    if (departmentId) query.append('department_id', departmentId);
    if (courseId) query.append('course_id', courseId);
    if (tagId) query.append('tag_id', tagId);
    if (sortBy) query.append('sort_by', sortBy);

    const response = await fetch(`${API_BASE_URL}/notes?${query.toString()}`);
    const notes = await response.json();
    const notesContainer = document.getElementById('notes-container');
    notesContainer.innerHTML = '';

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.classList.add('note-card');
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <p>Course: ${note.course_name}</p>
            <p>Tags: ${note.tags}</p>
            <p>Avg. Rating: ${note.avg_rating || 'N/A'}</p>
            <button onclick="viewNoteDetails(${note.note_id})">View Details</button>
        `;
        notesContainer.appendChild(noteCard);
    });
};

const viewNoteDetails = (noteId) => {
    window.location.href = `note-detail.html?id=${noteId}`;
};

// Event listeners for filter changes
document.getElementById('department-dropdown').addEventListener('change', (e) => {
    fetchCourses(e.target.value);
    fetchNotes();
});
document.getElementById('course-dropdown').addEventListener('change', fetchNotes);
document.getElementById('tag-dropdown').addEventListener('change', fetchNotes);
document.getElementById('sort-dropdown').addEventListener('change', fetchNotes);

// Initialize data
fetchDepartments();
fetchTags();
fetchNotes();