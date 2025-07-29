use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("{message}")]
    BadRequest {
        code: String,
        message: String,
        details: Option<serde_json::Value>,
    },
    
    #[error("{message}")]
    NotFound {
        code: String,
        message: String,
        details: Option<serde_json::Value>,
    },
    
    #[error("{message}")]
    InternalError {
        code: String,
        message: String,
        details: Option<serde_json::Value>,
    },
    
    #[error("{message}")]
    Unauthorized {
        code: String,
        message: String,
        details: Option<serde_json::Value>,
    },
    
    #[error("{message}")]
    Conflict {
        code: String,
        message: String,
        details: Option<serde_json::Value>,
    },
}

#[derive(Serialize)]
struct ErrorResponse {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<serde_json::Value>,
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let error_response = match self {
            ApiError::BadRequest { code, message, details } => ErrorResponse {
                code: code.clone(),
                message: message.clone(),
                details: details.clone(),
            },
            ApiError::NotFound { code, message, details } => ErrorResponse {
                code: code.clone(),
                message: message.clone(),
                details: details.clone(),
            },
            ApiError::InternalError { code, message, details } => ErrorResponse {
                code: code.clone(),
                message: message.clone(),
                details: details.clone(),
            },
            ApiError::Unauthorized { code, message, details } => ErrorResponse {
                code: code.clone(),
                message: message.clone(),
                details: details.clone(),
            },
            ApiError::Conflict { code, message, details } => ErrorResponse {
                code: code.clone(),
                message: message.clone(),
                details: details.clone(),
            },
        };
        
        HttpResponse::build(status).json(error_response)
    }
    
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::BadRequest { .. } => StatusCode::BAD_REQUEST,
            ApiError::NotFound { .. } => StatusCode::NOT_FOUND,
            ApiError::Unauthorized { .. } => StatusCode::UNAUTHORIZED,
            ApiError::Conflict { .. } => StatusCode::CONFLICT,
            ApiError::InternalError { .. } => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError::InternalError {
            code: "DATABASE_ERROR".to_string(),
            message: err.to_string(),
            details: None,
        }
    }
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        ApiError::InternalError {
            code: "HTTP_ERROR".to_string(),
            message: format!("HTTP request failed: {}", err),
            details: None,
        }
    }
}

impl From<validator::ValidationErrors> for ApiError {
    fn from(err: validator::ValidationErrors) -> Self {
        ApiError::BadRequest {
            code: "VALIDATION_ERROR".to_string(),
            message: "Validation failed".to_string(),
            details: Some(serde_json::to_value(&err).unwrap_or(serde_json::Value::Null)),
        }
    }
}

impl From<bitcoin::key::Error> for ApiError {
    fn from(err: bitcoin::key::Error) -> Self {
        ApiError::InternalError {
            code: "BITCOIN_KEY_ERROR".to_string(),
            message: err.to_string(),
            details: None,
        }
    }
}