export function isDeadlinePassed(dueDate: Date | string, now: Date = new Date()): boolean {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return now.getTime() > due.getTime();
}

export function validateMilestoneInput(body: any): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: { title: string; description: string; dueDate: Date };
} {
  const errors: Record<string, string> = {};
  const { title, description, dueDate } = body || {};

  if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 150) {
    errors.title = "Title must be between 3 and 150 characters";
  }

  if (!description || typeof description !== "string" || description.trim().length < 5 || description.trim().length > 2000) {
    errors.description = "Description must be between 5 and 2000 characters";
  }

  if (!dueDate || typeof dueDate !== "string" || isNaN(Date.parse(dueDate))) {
    errors.dueDate = "Valid due date is required";
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors,
    data: {
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate),
    },
  };
}

export function validateFeedbackInput(body: any): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: { comment: string; status: "APPROVED" | "CHANGES_REQUESTED" };
} {
  const errors: Record<string, string> = {};
  const { comment, status } = body || {};

  if (!comment || typeof comment !== "string" || comment.trim().length < 3 || comment.trim().length > 2000) {
    errors.comment = "Comment must be between 3 and 2000 characters";
  }

  if (!status || !["APPROVED", "CHANGES_REQUESTED"].includes(status)) {
    errors.status = "Status must be either APPROVED or CHANGES_REQUESTED";
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors,
    data: {
      comment: comment.trim(),
      status,
    },
  };
}

export function validateSubmissionInput(body: any): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: { title: string; description: string; artifactUrl: string };
} {
  const errors: Record<string, string> = {};
  const { title, description, artifactUrl } = body || {};

  if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 150) {
    errors.title = "Title must be between 3 and 150 characters";
  }

  if (!description || typeof description !== "string" || description.trim().length < 5 || description.trim().length > 2000) {
    errors.description = "Description must be between 5 and 2000 characters";
  }

  if (
    !artifactUrl ||
    typeof artifactUrl !== "string" ||
    (!artifactUrl.startsWith("http://") && !artifactUrl.startsWith("https://"))
  ) {
    errors.artifactUrl = "Artifact URL must be a valid HTTP or HTTPS link";
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors,
    data: {
      title: title.trim(),
      description: description.trim(),
      artifactUrl: artifactUrl.trim(),
    },
  };
}
