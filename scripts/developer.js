document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadDeletedNotes();
    loadDeletedReviews();
  });
  
  function loadStats() {
    fetch('https://your-api-url/stats') // Adjust API base URL
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
    fetch('https://your-api-url/deleted-notes')
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
    fetch('https://your-api-url/deleted-reviews')
      .then(res => res.json())
      .then(reviews => {
        const container = document.getElementById('deleted-reviews');
        if (reviews.length === 0) {
          container.innerHTML = '<p>No deleted reviews.</p>';
          return;
        }
  
        container.innerHTML = reviews.map(review => `
          <div class="note-card">
            <p><strong>Rating:</strong> ${review.rating}</p>
            <p>${review.content}</p>
            <p>Deleted at: ${new Date(review.deleted_at).toLocaleString()}</p>
            <button onclick="restoreReview(${review.review_id})">Restore</button>
          </div>
        `).join('');
      });
  }
  
  function restoreNote(noteId) {
    fetch(`https://your-api-url/restore-note/${noteId}`, { method: 'POST' })
      .then(res => {
        if (res.ok) {
          alert('Note restored');
          loadDeletedNotes();
        }
      });
  }
  
  function restoreReview(reviewId) {
    fetch(`https://your-api-url/restore-review/${reviewId}`, { method: 'POST' })
      .then(res => {
        if (res.ok) {
          alert('Review restored');
          loadDeletedReviews();
        }
      });
  }
  