document.addEventListener('DOMContentLoaded', () => {
    const departmentDropdown = document.getElementById('department_id');
    const courseDropdown = document.getElementById('course_id');
    const tagDropdown = document.getElementById('tag_id');
    const uploadForm = document.getElementById('upload-note-form');
  
    if (!departmentDropdown || !courseDropdown || !tagDropdown || !uploadForm) {
      console.error('Required DOM elements not found');
      return;
    }
  
    // Load departments
    const fetchDepartments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/departments`);
        const departments = await res.json();
        departments.forEach(dep => {
          const option = document.createElement('option');
          option.value = dep.department_id;
          option.textContent = dep.name;
          departmentDropdown.appendChild(option);
        });
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
  
    // Load courses for selected department
    const fetchCourses = async (departmentId) => {
      courseDropdown.innerHTML = '<option value="">Select Course</option>';
      if (!departmentId) return;
  
      try {
        const res = await fetch(`${API_BASE_URL}/courses?department_id=${departmentId}`);
        const courses = await res.json();
        courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course.course_id;
          option.textContent = course.name;
          courseDropdown.appendChild(option);
        });
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };
  
    // Load tags
    const fetchTags = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tags`);
        const tags = await res.json();
        tags.forEach(tag => {
          const option = document.createElement('option');
          option.value = tag.tag_id;
          option.textContent = tag.name;
          tagDropdown.appendChild(option);
        });
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
  
    // Handle department change
    departmentDropdown.addEventListener('change', (e) => {
      const selectedDepartment = e.target.value;
      fetchCourses(selectedDepartment);
    });
  
    // Handle form submit
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(uploadForm);
  
      try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData
        });
  
        if (response.ok) {
          alert('Note uploaded successfully!');
          uploadForm.reset();
          courseDropdown.innerHTML = '<option value="">Select Course</option>';
        } else {
          const error = await response.text();
          alert('Upload failed: ' + error);
        }
      } catch (err) {
        alert('An error occurred during upload.');
        console.error(err);
      }
    });
  
    fetchDepartments();
    fetchTags();
  });  