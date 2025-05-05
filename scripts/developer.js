document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadDeletedNotes();
  loadDeletedReviews();
});

function loadStats() {
  fetch(`${API_BASE_URL}/stats`) 
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('stats');
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
    });
}

function loadDeletedNotes() {
  fetch(`${API_BASE_URL}/deleted-notes`)
    .then(res => res.json())
    .then(notes => {
      const container = document.getElementById('deleted-notes');
      if (notes.length === 0) {
        container.innerHTML = '<p>No deleted notes.</p>';
        return;
      }

      container.innerHTML = notes.map(note => `
        <div class="note-card">
          <h3>${note.title}</h3>
          <p>Deleted at: ${new Date(note.deleted_at).toLocaleString()}</p>
          <button onclick="restoreNote(${note.note_id})">Restore</button>
        </div>
      `).join('');
    });
}

function loadDeletedReviews() {
  fetch(`${API_BASE_URL}/deleted-reviews`)
    .then(res => res.json())
    .then(reviews => {
      const container = document.getElementById('deleted-reviews');
      if (reviews.length === 0) {
        container.innerHTML = '<p>No deleted reviews.</p>';
        return;
      }

      container.innerHTML = reviews.map(review => `
        <div class="note-card">
          <p><strong>Note:</strong> ${review.note_title}</p>
          <p><strong>Rating:</strong> ${review.rating}</p>
          <p>${review.content}</p>
          <p><em>Deleted at:</em> ${new Date(review.deleted_at).toLocaleString()}</p>
          <button onclick="restoreReview(${review.review_id})">Restore</button>
        </div>
      `).join('');
    });
}

function restoreNote(noteId) {
  fetch(`${API_BASE_URL}/restore-note/${noteId}`, { method: 'POST' })
    .then(res => {
      if (res.ok) {
        alert('Note restored');
        loadDeletedNotes();
      }
    });
}

function restoreReview(reviewId) {
  fetch(`${API_BASE_URL}/restore-review/${reviewId}`, { method: 'POST' })
    .then(res => {
      if (res.ok) {
        alert('Review restored');
        loadDeletedReviews();
      }
    });
}

function loadDepartmentsForCourseForm() {
  fetch(`${API_BASE_URL}/departments`)
    .then(res => res.json())
    .then(departments => {
      const select = document.getElementById('department-select');
      departments.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep.department_id;
        option.textContent = dep.name;
        select.appendChild(option);
      });
    })
    .catch(err => {
      console.error('Error loading departments:', err);
    });
}

document.getElementById('course-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const course_id = document.getElementById('course-id').value.trim();
  const name = document.getElementById('new-course').value.trim();
  const department_id = document.getElementById('department-select').value;

  if (!course_id || !name || !department_id) {
    alert('Please fill out all fields.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id, name, department_id })
    });

    if (res.ok) {
      alert('Course added successfully');
      document.getElementById('course-form').reset();
    } else {
      alert('Failed to add course (maybe ID already exists?)');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error adding course');
  }
});


document.getElementById('tag-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-tag').value.trim();
  if (!name) return;

  try {
    const res = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      alert('Tag added successfully');
      document.getElementById('tag-form').reset();
    } else {
      alert('Failed to add tag');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error adding tag');
  }
});

loadDepartmentsForCourseForm();