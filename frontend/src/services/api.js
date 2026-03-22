const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Register a new user with their voice recording
 */
export async function registerVoice(username, audioBlob) {
  const formData = new FormData();
  formData.append("username", username);
  formData.append(
    "audio",
    new File([audioBlob], "recording.webm", { type: "audio/webm" })
  );

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return {
    success: data.success === true,
    message: data.message || "Registration failed.",
  };
}

/**
 * Authenticate a user with their voice recording
 */
export async function authenticateVoice(username, audioBlob) {
  const formData = new FormData();
  formData.append("username", username);
  formData.append(
    "audio",
    new File([audioBlob], "recording.webm", { type: "audio/webm" })
  );

  const res = await fetch(`${API_URL}/authenticate`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Server error: ${res.status}`);
  }

  // Return clean structured data directly from Flask JSON
  return {
    success:       data.success,
    username:      data.username,
    status:        data.status,
    access:        data.access,
    similarity:    data.similarity,
    distance:      data.distance,
    real_prob:     data.real_prob,
    fake_prob:     data.fake_prob,
    reason:        data.reason,
    reg_spec:      data.reg_spec   || null,
    login_spec:    data.login_spec || null,
    lime_img:      data.lime_img   || null,
    grad_img:      data.grad_img   || null,
    report:        data.report     || null,
    aasist_loaded: data.aasist_loaded,
  };
}