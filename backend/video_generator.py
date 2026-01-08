from moviepy.editor import ImageClip, concatenate_videoclips, CompositeVideoClip
import os

def create_video_from_images(image_paths, output_video_path, duration_per_image, transition="none", transition_duration=1.0):
    """
    Creates a video from a list of image paths with optional transitions.
    Transitions: 'none', 'crossfade'
    """
    clips = [ImageClip(m).set_duration(duration_per_image) for m in image_paths]
    
    if transition == "crossfade":
        # To crossfade, we need to overlap clips.
        # We start each clip transition_duration earlier than the previous one ends (except the first).
        # Actually easier approach with moviepy: use CompositeVideoClip or simply set crossfadein on clips.
        # Standard approach: concatenate with padding and crossfade.
        
        # Let's use simple concatenation with crossfade
        # Note: concatenate_videoclips with method="compose" supports padding, but automatic crossfade is manual.
        # We will make each clip fade in from the previous.
        
        processed_clips = []
        for i, clip in enumerate(clips):
            # We add transition_duration to the duration to account for the overlap
            # EXCEPT for the last one maybe? No, let's keep it simple.
            
            # Better approach:
            # clip 1: 0 to 5s. 
            # clip 2 starts at 4s (1s overlap). Ends at 9s.
            # Total duration per clip effectively becomes (duration + transition).
            
            # Simple implementation:
            # Just use concatenate_videoclips with padding=-1 (negative padding = overlap)
            # and add crossfade.
            
            if i > 0:
                clip = clip.crossfadein(transition_duration)
            
            processed_clips.append(clip)
            
        # method='compose' is required for crossfades to work during concatenation with overlap
        final_clip = concatenate_videoclips(processed_clips, method="compose", padding=-transition_duration)
        
    elif transition == "fadeinout":
        # Dip to black
        processed_clips = []
        gap_duration = 0.5 # Black gap
        for clip in clips:
            clip = clip.fadein(0.5).fadeout(0.5)
            processed_clips.append(clip)
            # No straightforward "gap" in concat without a spacer clip, but we can just concatenation normally
        final_clip = concatenate_videoclips(processed_clips, method="compose")
        
    else: 
        # None
        final_clip = concatenate_videoclips(clips, method="compose") # compose is safer than chain
    
    # Write the video file
    # Write the video file
    # threads=1 to reduce memory usage
    final_clip.write_videofile(output_video_path, fps=24, codec='libx264', audio=False, threads=1)
    
    # Close clips to free memory
    final_clip.close()
    for clip in clips:
        clip.close()
    
    return output_video_path
