const fetchCoursesAndTags = async () => {
  const courseDropdown = document.getElementById('course_id');
  const tagDropdown = document.getElementById('tag_id');

  // Fetch courses
  const courseRes = await fetch('http://localhost:3000/courses');
  const courses = await courseRes.json();
  courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.course_id;
      option.textContent = course.name;
      courseDropdown.appendChild(option);
  });

  // Fetch tags
  const tagRes = await fetch('http://localhost:3000/tags');
  const tags = await tagRes.json();
  tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.tag_id;
      option.textContent = tag.name;
      tagDropdown.appendChild(option);
  });
};

document.getElementById('upload-note-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const courseId = document.getElementById('course_id').value;
  const tagId = document.getElementById('tag_id').value;
  const fileInput = document.getElementById('file');
  const file = fileInput.files[0];

  if (!file) {
      alert('Please select a file to upload.');
      return;
  }

  // Step 1: Upload note metadata
  const noteRes = await fetch('http://localhost:3000/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, course_id: courseId })
  });

  const noteData = await noteRes.json();
  const noteId = noteData.note_id;

  // Step 2: Upload file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('note_id', noteId);

  await fetch('http://localhost:3000/files/upload', {
      method: 'POST',
      body: formData
  });

  // Step 3: Link tag
  await fetch('http://localhost:3000/note_tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: noteId, tag_id: tagId })
  });

  alert('Note uploaded successfully!');
  document.getElementById('upload-note-form').reset();
});

fetchCoursesAndTags();
