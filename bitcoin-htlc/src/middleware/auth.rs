use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    body::EitherBody,
    Error, HttpResponse,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};

pub struct ApiKeyAuth;

impl<S, B> Transform<S, ServiceRequest> for ApiKeyAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = ApiKeyAuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ApiKeyAuthMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct ApiKeyAuthMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for ApiKeyAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();

        Box::pin(async move {
            // Skip auth for health check and swagger endpoints
            let path = req.path();
            if path == "/v1/health" || path == "/swagger-ui" || path == "/openapi.yaml" {
                let res = svc.call(req).await?;
                return Ok(res.map_into_left_body());
            }

            // Check for API key in header
            let api_key = req.headers().get("X-API-Key");
            
            match api_key {
                Some(key) => {
                    // In production, validate against stored API keys
                    // For demo, accept any non-empty key
                    if !key.is_empty() {
                        let res = svc.call(req).await?;
                        Ok(res.map_into_left_body())
                    } else {
                        let response = HttpResponse::Unauthorized()
                            .json(serde_json::json!({
                                "code": "INVALID_API_KEY",
                                "message": "Invalid API key"
                            }));
                        
                        Ok(req.into_response(response.map_into_right_body()))
                    }
                }
                None => {
                    let response = HttpResponse::Unauthorized()
                        .json(serde_json::json!({
                            "code": "MISSING_API_KEY",
                            "message": "Missing X-API-Key header"
                        }));
                    
                    Ok(req.into_response(response.map_into_right_body()))
                }
            }
        })
    }
}