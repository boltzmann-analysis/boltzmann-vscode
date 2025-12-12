import { None, Option, Some } from "./option";

export function Ok<T, F>(inner: T){
    return Result.Ok<T, F>(inner);
}

export function Fail<T, F>(failure: F){
    return Result.Fail<T, F>(failure);
}

export class Result<T, F>{
    private inner: T | null;
    private failure: F | null;
    
    
    private constructor(inner: T | null, failure: F | null) {
        this.inner = inner;
        this.failure = failure;
    }
    
    static Ok<T, F>(inner: T) {
        return new Result<T, F>(inner, null);
    }
    
    static Fail<T, F>(failure: F) {
        return new Result<T, F>(null, failure);
    }

	toOption(): Option<T> {
        if(this.inner === null) {
            return None();
        }

        return Some(this.inner);
	}

	isOk(): boolean {
		return this.inner !== null;
	}

	isFail(): boolean {
		return this.failure !== null;
	}
}