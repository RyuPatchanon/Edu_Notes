const apiBase = "http://localhost:4000"; // Change this to your deployed backend URL later

const departmentSelect = document.getElementById("department-select");
const courseSelect = document.getElementById("course-select");
const tagSelect = document.getElementById("tag-select");
const sortSelect = document.getElementById("sort-select");
const notesContainer = document.getElementById("notes-container");

// Fetch all initial data
window.addEventListener("DOMContentLoaded", () => {
  fetchDepartments();
  fetchTags();
  fetchNotes();
});

// Fetch departments
async function fetchDepartments() {
  const res = await fetch(`${apiBase}/departments`);
  const departments = await res.json();
  departments.forEach(dept => {
    const option = document.createElement("option");
    option.value = dept.department_id;
    option.textContent = dept.name;
    departmentSelect.appendChild(option);
  });
}

// Fetch courses based on department
departmentSelect.addEventListener("change", async () => {
  courseSelect.innerHTML = '<option value="">All</option>';
  const deptId = departmentSelect.value;
  if (!deptId) return;
  const res = await fetch(`${apiBase}/courses?department_id=${deptId}`);
  const courses = await res.json();
  courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course.course_id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });
  fetchNotes(); // Update results when department changes
});

// Fetch tags
async function fetchTags() {
  const res = await fetch(`${apiBase}/tags`);
  const tags = await res.json();
  tags.forEach(tag => {
    const option = document.createElement("option");
    option.value = tag.tag_id;
    option.textContent = tag.name;
    tagSelect.appendChild(option);
  });
}

// Fetch and render notes
async function fetchNotes() {
  const params = new URLSearchParams();
  if (departmentSelect.value) params.append("department_id", departmentSelect.value);
  if (courseSelect.value) params.append("course_id", courseSelect.value);
  if (tagSelect.value) params.append("tag_id", tagSelect.value);
  if (sortSelect.value) params.append("sort_by", sortSelect.value);

  const res = await fetch(`${apiBase}/notes?${params.toString()}`);
  const notes = await res.json();
  renderNotes(notes);
}

// Trigger on any change
[departmentSelect, courseSelect, tagSelect, sortSelect].forEach(select =>
  select.addEventListener("change", fetchNotes)
);

// Render note cards
function renderNotes(notes) {
  notesContainer.innerHTML = "";
  if (notes.length === 0) {
    notesContainer.textContent = "No notes found.";
    return;
  }

  notes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";

    card.innerHTML = `
      <div class="note-title">${note.title}</div>
      <div>Course: ${note.course_name || "Unknown"}</div>
      <div class="note-tags">Tags: ${note.tags || "None"}</div>
      <div>Rating: ${note.avg_rating !== null ? note.avg_rating.toFixed(1) : "No reviews"}</div>
    `;

    notesContainer.appendChild(card);
  });
}
